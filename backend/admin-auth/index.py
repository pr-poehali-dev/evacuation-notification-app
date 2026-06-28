import json
import os
import hashlib
import hmac
import time
import secrets


def make_token(pin_hash: str) -> str:
    """Создаёт временный токен сессии на 8 часов."""
    ts = str(int(time.time() // (8 * 3600)))
    return hmac.new(pin_hash.encode(), ts.encode(), hashlib.sha256).hexdigest()


def handler(event: dict, context) -> dict:
    """
    Проверяет пин-код администратора и возвращает сессионный токен.
    POST / — { "pin": "1234" } → { "ok": true, "token": "..." }
    GET  / — { "valid": true/false } (проверка токена из заголовка X-Admin-Token)
    """
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**cors, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    stored_pin = os.environ.get('ADMIN_PIN', '')
    pin_hash = hashlib.sha256(stored_pin.encode()).hexdigest()
    expected_token = make_token(pin_hash)

    method = event.get('httpMethod', 'GET')

    if method == 'GET':
        token = (event.get('headers') or {}).get('x-admin-token', '')
        valid = secrets.compare_digest(token, expected_token)
        return {
            'statusCode': 200,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'valid': valid}),
        }

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        entered_pin = str(body.get('pin', ''))
        entered_hash = hashlib.sha256(entered_pin.encode()).hexdigest()

        if not secrets.compare_digest(entered_hash, pin_hash):
            return {
                'statusCode': 401,
                'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'ok': False, 'error': 'Неверный пин-код'}),
            }

        return {
            'statusCode': 200,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True, 'token': expected_token}),
        }

    return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}
