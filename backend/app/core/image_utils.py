import io
from typing import Optional

from PIL import Image, ImageOps

DEFAULT_MAX_DIMENSION = 1600
DEFAULT_QUALITY = 85


def resize_and_recompress(
    content: bytes,
    max_dimension: int = DEFAULT_MAX_DIMENSION,
    quality: int = DEFAULT_QUALITY,
) -> Optional[bytes]:
    """Downscale to `max_dimension` on the long side (never upscales) and
    recompress as JPEG. Returns None if the image is animated (GIF/WEBP —
    converting to JPEG would collapse it to one frame) or can't be decoded —
    callers should keep the original bytes/extension in that case.

    Shared by the upload endpoint (vehicle_photos.py) and the one-off
    backfill script (backfill_vehicle_photo_sizes.py) so both apply the
    exact same transformation, never two copies that drift apart.
    """
    try:
        img = Image.open(io.BytesIO(content))
        if getattr(img, "is_animated", False):
            return None
        img = ImageOps.exif_transpose(img)
        if img.mode in ("RGBA", "LA", "P"):
            # Aplanar transparencia sobre blanco antes de convertir a RGB —
            # un .convert("RGB") directo sobre un canal alpha deja
            # artefactos negros donde había transparencia. Sin significado
            # real en una foto de vehículo.
            img = img.convert("RGBA")
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        img.thumbnail((max_dimension, max_dimension), Image.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=quality)
        return out.getvalue()
    except Exception:
        return None
