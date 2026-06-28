import json
import os
import psycopg2

SCHEMA = 't_p77374368_evacuation_notificat'


def handler(event: dict, context) -> dict:
    """
    Бэкенд для сохранения/удаления push-подписки устройства.
    POST /  — сохранить подписку (endpoint, p256dh, auth)
    DELETE / — удалить подписку по endpoint
    GET /   — вернуть VAPID публичный ключ
    """
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**cors, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    method = event.get('httpMethod', 'GET')

    # GET — публичный ключ для браузера (не требует БД)
    if method == 'GET':
        pub = os.environ.get('VAPID_PUBLIC_KEY', '')
        return {
            'statusCode': 200,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'vapid_public_key': pub}),
        }

    body = json.loads(event.get('body') or '{}')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    if method == 'POST':
        endpoint = body.get('endpoint')
        p256dh = body.get('p256dh')
        auth = body.get('auth')
        ua = (event.get('headers') or {}).get('user-agent', '')[:255]

        if not endpoint or not p256dh or not auth:
            conn.close()
            return {'statusCode': 400, 'headers': cors,
                    'body': json.dumps({'error': 'Missing fields'})}

        cur.execute(
            f"""INSERT INTO "{SCHEMA}".push_subscriptions (endpoint, p256dh, auth, user_agent)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth""",
            (endpoint, p256dh, auth, ua)
        )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}

    if method == 'DELETE':
        endpoint = body.get('endpoint')
        if endpoint:
            cur.execute(
                f'DELETE FROM "{SCHEMA}".push_subscriptions WHERE endpoint = %s',
                (endpoint,)
            )
            conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}
