import json
import os
import base64
import struct
import time
import hashlib
import hmac

import psycopg2
import requests

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature


def b64url_decode(s: str) -> bytes:
    s += '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s)


def b64url_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def make_jwt(subject: str, private_key_b64: str, audience: str) -> str:
    """Создаёт подписанный VAPID JWT токен для конкретного audience."""
    header = b64url_encode(json.dumps({'typ': 'JWT', 'alg': 'ES256'}).encode())
    exp = int(time.time()) + 12 * 3600
    payload = b64url_encode(json.dumps({'aud': audience, 'exp': exp, 'sub': subject}).encode())
    signing_input = f'{header}.{payload}'.encode()

    priv_int = int.from_bytes(b64url_decode(private_key_b64), 'big')
    private_key = ec.derive_private_key(priv_int, ec.SECP256R1())
    signature_der = private_key.sign(signing_input, ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(signature_der)
    sig = r.to_bytes(32, 'big') + s.to_bytes(32, 'big')
    return f'{header}.{payload}.{b64url_encode(sig)}'


def send_push(subscription: dict, payload_str: str, vapid_jwt: str, vapid_pub: str) -> int:
    """Отправляет зашифрованное push-сообщение на endpoint подписчика."""
    endpoint = subscription['endpoint']
    p256dh = b64url_decode(subscription['p256dh'])
    auth = b64url_decode(subscription['auth'])

    # ECDH шифрование (ECE / aes128gcm)
    from cryptography.hazmat.primitives.asymmetric.ec import ECDH
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    salt = os.urandom(16)
    server_private = ec.generate_private_key(ec.SECP256R1())
    server_public = server_private.public_key()

    # Ключ получателя
    client_pub = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), p256dh)

    # Общий секрет
    shared_secret = server_private.exchange(ECDH(), client_pub)

    server_pub_bytes = server_public.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )

    # PRK auth
    prk_key = hmac.new(auth, shared_secret, hashlib.sha256).digest()
    info_key = b'WebPush: info\x00' + p256dh + server_pub_bytes
    ikm = hmac.new(prk_key, info_key + b'\x01', hashlib.sha256).digest()

    # CEK + nonce
    prk_enc = hmac.new(salt, ikm, hashlib.sha256).digest()
    info_cek = b'Content-Encoding: aes128gcm\x00'
    cek = hmac.new(prk_enc, info_cek + b'\x01', hashlib.sha256).digest()[:16]
    info_nonce = b'Content-Encoding: nonce\x00'
    nonce = hmac.new(prk_enc, info_nonce + b'\x01', hashlib.sha256).digest()[:12]

    # Шифрование
    plaintext = payload_str.encode() + b'\x02'
    ciphertext = AESGCM(cek).encrypt(nonce, plaintext, None)

    # aes128gcm header
    rs = len(ciphertext) + 1
    header = salt + struct.pack('>I', rs) + bytes([len(server_pub_bytes)]) + server_pub_bytes
    body = header + ciphertext

    headers = {
        'Authorization': f'vapid t={vapid_jwt},k={vapid_pub}',
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
    }
    resp = requests.post(endpoint, data=body, headers=headers, timeout=10)
    return resp.status_code


def handler(event: dict, context) -> dict:
    """
    Бэкенд для отправки реального push-оповещения об эвакуации всем подписанным устройствам.
    POST / — запустить тревогу (signal_code, message)
    """
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**cors, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    # Проверка токена администратора
    import secrets as _secrets
    stored_pin = os.environ.get('ADMIN_PIN', '')
    pin_hash = hashlib.sha256(stored_pin.encode()).hexdigest()
    ts = str(int(time.time() // (8 * 3600)))
    expected_token = hmac.new(pin_hash.encode(), ts.encode(), hashlib.sha256).hexdigest()
    incoming_token = (event.get('headers') or {}).get('x-admin-token', '')
    if not _secrets.compare_digest(incoming_token, expected_token):
        return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Доступ запрещён'})}

    body = json.loads(event.get('body') or '{}')
    signal_code = body.get('signal_code', 'SIG-01')
    message = body.get('message', 'ТРЕВОГА · ЭВАКУАЦИЯ. Немедленно покиньте здание.')

    vapid_private = os.environ['VAPID_PRIVATE_KEY']
    vapid_public = os.environ['VAPID_PUBLIC_KEY']
    vapid_subject = os.environ.get('VAPID_SUBJECT', 'mailto:admin@example.com')

    schema = 't_p77374368_evacuation_notificat'  # v2
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    cur.execute(f'SELECT endpoint, p256dh, auth FROM "{schema}".push_subscriptions')
    subs = [{'endpoint': r[0], 'p256dh': r[1], 'auth': r[2]} for r in cur.fetchall()]

    if not subs:
        conn.close()
        return {'statusCode': 200, 'headers': cors,
                'body': json.dumps({'ok': True, 'sent': 0, 'message': 'Нет подписчиков'})}

    payload = json.dumps({'title': f'EVAC·SYSTEM · {signal_code}', 'body': message, 'badge': '/favicon.svg'})

    sent = 0
    failed_endpoints = []
    for sub in subs:
        from urllib.parse import urlparse
        parsed = urlparse(sub['endpoint'])
        audience = f'{parsed.scheme}://{parsed.netloc}'
        jwt_token = make_jwt(vapid_subject, vapid_private, audience)
        status = send_push(sub, payload, jwt_token, vapid_public)
        if status in (200, 201):
            sent += 1
        elif status in (404, 410):
            failed_endpoints.append(sub['endpoint'])

    for ep in failed_endpoints:
        cur.execute(f'DELETE FROM "{schema}".push_subscriptions WHERE endpoint = %s', (ep,))

    cur.execute(
        f'INSERT INTO "{schema}".alarm_log (signal_code, message, sent_count) VALUES (%s, %s, %s)',
        (signal_code, message, sent)
    )
    conn.commit()
    conn.close()

    return {'statusCode': 200, 'headers': cors,
            'body': json.dumps({'ok': True, 'sent': sent, 'total': len(subs)})}