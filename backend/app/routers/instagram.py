import os
import urllib.request
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.instagram_post import InstagramPost

router = APIRouter(prefix="/api/instagram", tags=["instagram"], redirect_slashes=False)

_IG_FIELDS = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp"
_IG_BASE = "https://graph.instagram.com"


class InstagramPostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    instagram_id: str
    media_url: str
    thumbnail_url: Optional[str] = None
    permalink: str
    caption: Optional[str] = None
    media_type: Optional[str] = None
    timestamp: Optional[datetime] = None


class SyncResult(BaseModel):
    synced: int
    message: str


def _get_token() -> Optional[str]:
    return os.getenv("INSTAGRAM_ACCESS_TOKEN")


def _refresh_token_if_needed(token: str) -> str:
    """Refresh a long-lived token if it's close to expiry (silent fail)."""
    try:
        url = f"{_IG_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token={token}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        return data.get("access_token", token)
    except Exception:
        return token


def _fetch_feed(token: str) -> list:
    url = f"{_IG_BASE}/me/media?fields={_IG_FIELDS}&limit=12&access_token={token}"
    req = urllib.request.Request(url, headers={"User-Agent": "CaminoAMiBoda/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    return data.get("data", [])


@router.get("/feed", response_model=List[InstagramPostRead])
def get_instagram_feed(db: Session = Depends(get_db)):
    posts = (
        db.query(InstagramPost)
        .order_by(InstagramPost.timestamp.desc().nullslast())
        .limit(12)
        .all()
    )
    return posts


@router.post("/sync", response_model=SyncResult)
def sync_instagram(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    token = _get_token()
    if not token:
        raise HTTPException(400, "INSTAGRAM_ACCESS_TOKEN no configurado en variables de entorno")

    token = _refresh_token_if_needed(token)

    try:
        posts = _fetch_feed(token)
    except Exception as e:
        raise HTTPException(502, f"Error al obtener posts de Instagram: {e}")

    now = datetime.now(timezone.utc)
    synced = 0
    for post in posts:
        media_url = post.get("media_url") or post.get("thumbnail_url")
        if not media_url:
            continue

        ts_str = post.get("timestamp")
        ts = None
        if ts_str:
            try:
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            except Exception:
                pass

        existing = db.get(InstagramPost, post["id"])
        if existing:
            existing.media_url = media_url
            existing.thumbnail_url = post.get("thumbnail_url")
            existing.caption = post.get("caption")
            existing.media_type = post.get("media_type")
            existing.timestamp = ts
            existing.fetched_at = now
        else:
            db.add(InstagramPost(
                instagram_id=post["id"],
                media_url=media_url,
                thumbnail_url=post.get("thumbnail_url"),
                permalink=post["permalink"],
                caption=post.get("caption"),
                media_type=post.get("media_type"),
                timestamp=ts,
                fetched_at=now,
            ))
            synced += 1

    db.commit()
    return SyncResult(synced=synced, message=f"{len(posts)} posts sincronizados ({synced} nuevos)")
