"""
One-time Google Calendar OAuth2 authorization script.

Usage:
    1. Download credentials.json from Google Cloud Console and place it in backend/
    2. From backend/ directory run:  python scripts/gcal_auth.py
    3. A browser window will open. Log in and grant Calendar access.
    4. Copy the printed GOOGLE_REFRESH_TOKEN into backend/.env and docker-compose.yml

Requirements: pip install google-auth-oauthlib
"""
import json
import os
import sys

SCOPES = ["https://www.googleapis.com/auth/calendar"]
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "..", "credentials.json")


def main():
    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print("ERROR: google-auth-oauthlib is not installed.")
        print("Run: pip install google-auth-oauthlib")
        sys.exit(1)

    if not os.path.exists(CREDENTIALS_FILE):
        print(f"ERROR: credentials.json not found at {CREDENTIALS_FILE}")
        print("Download it from: console.cloud.google.com → APIs → Credentials → your OAuth client → Download")
        sys.exit(1)

    flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
    creds = flow.run_local_server(port=0)

    print("\n✅ Authorization successful!\n")
    print("Add these values to backend/.env and docker-compose.yml:\n")
    print(f"GOOGLE_CLIENT_ID={creds.client_id}")
    print(f"GOOGLE_CLIENT_SECRET={creds.client_secret}")
    print(f"GOOGLE_REFRESH_TOKEN={creds.refresh_token}")
    print(f"GOOGLE_CALENDAR_ID=primary")
    print()

    with open("credentials.json") as f:
        raw = json.load(f)
    installed = raw.get("installed") or raw.get("web") or {}
    print("Verification — client_id from file:", installed.get("client_id", "(not found)"))


if __name__ == "__main__":
    main()
