import json
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def handler(event: dict, context) -> dict:
    '''
    Business: Одноразовая генерация VAPID-ключей (P-256) для Web Push.
    Args: event - dict с httpMethod; context - объект с request_id.
    Returns: HTTP-ответ с публичным и приватным ключами в base64url.
    '''
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    raw_public = public_key.public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    private_value = private_key.private_numbers().private_value
    raw_private = private_value.to_bytes(32, 'big')

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'isBase64Encoded': False,
        'body': json.dumps({
            'public_key': b64url(raw_public),
            'private_key': b64url(raw_private),
        }),
    }
