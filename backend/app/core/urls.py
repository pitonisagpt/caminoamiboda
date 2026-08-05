from app.config import settings


def build_upload_url(relative_path: str) -> str:
    """Prefix an /api/uploads/... path with the backend's public origin.

    Empty by default (PUBLIC_BACKEND_URL unset) so local dev keeps working
    exactly as before, via the Vite dev-server proxy. In production, where
    the frontend and backend are served from different domains, this must
    be set so browsers fetch uploads from the right host.
    """
    base = settings.public_backend_url.rstrip("/")
    return f"{base}{relative_path}" if base else relative_path
