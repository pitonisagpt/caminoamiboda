"""
One-time Google Calendar OAuth2 authorization script.

Usage:
    From backend/ directory run:  python3 scripts/gcal_auth.py
    Copy the printed tokens into backend/.env and docker-compose.yml

Requirements: pip install google-auth-oauthlib google-api-python-client
"""
import json
import os
import sys
import socket
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

SCOPES = ["https://www.googleapis.com/auth/calendar"]
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "..", "credentials.json")
PORT = 8085

_auth_code = None


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        global _auth_code
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        if "code" in params:
            _auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<h2>Autorizado! Ya puedes cerrar esta ventana.</h2>")
        else:
            self.send_response(400)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # suppress access logs


def main():
    try:
        from google_auth_oauthlib.flow import Flow
        import google.oauth2.credentials
        import requests as _req
    except ImportError:
        print("ERROR: Dependencias faltantes.")
        print("Run: pip3 install google-auth-oauthlib google-api-python-client requests")
        sys.exit(1)

    if not os.path.exists(CREDENTIALS_FILE):
        print(f"ERROR: credentials.json no encontrado en {CREDENTIALS_FILE}")
        sys.exit(1)

    with open(CREDENTIALS_FILE) as f:
        raw = json.load(f)
    installed = raw.get("installed") or raw.get("web") or {}
    client_id = installed["client_id"]
    client_secret = installed["client_secret"]
    token_uri = installed.get("token_uri", "https://oauth2.googleapis.com/token")

    redirect_uri = f"http://localhost:{PORT}"

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "login_hint": "caminoatuboda@gmail.com",
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)

    print("\n" + "="*60)
    print("Abre esta URL en el browser con caminoatuboda@gmail.com:")
    print("="*60)
    print(auth_url)
    print("="*60 + "\n")
    sys.stdout.flush()

    server = HTTPServer(("localhost", PORT), _Handler)
    server.timeout = 1

    print(f"Esperando autorización en http://localhost:{PORT} ...")
    sys.stdout.flush()

    import time
    deadline = time.time() + 300  # 5 minutes
    while _auth_code is None and time.time() < deadline:
        server.handle_request()

    if not _auth_code:
        print("ERROR: No se recibió el código de autorización.")
        sys.exit(1)

    # Exchange code for tokens
    resp = _req.post(token_uri, data={
        "code": _auth_code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    })
    resp.raise_for_status()
    tokens = resp.json()

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        print("ERROR: No se obtuvo refresh_token. Revoca el acceso en myaccount.google.com y vuelve a intentar.")
        sys.exit(1)

    print("\n✅ Autorización exitosa!\n")
    print("Copia estos valores a backend/.env y docker-compose.yml:\n")
    print(f"GOOGLE_CLIENT_ID={client_id}")
    print(f"GOOGLE_CLIENT_SECRET={client_secret}")
    print(f"GOOGLE_REFRESH_TOKEN={refresh_token}")
    print(f"GOOGLE_CALENDAR_ID=primary")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
