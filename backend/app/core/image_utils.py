import io
from typing import Optional, TypedDict

from PIL import Image, ImageOps

DEFAULT_MAX_DIMENSION = 1600
DEFAULT_QUALITY = 85
CARD_MAX_DIMENSION = 480  # catalog grid thumbnail — cards render at ~250px, this covers up to 2x retina
CARD_QUALITY = 82


def _prepare(content: bytes) -> Optional[Image.Image]:
    """Decode + normalize an uploaded photo: EXIF-rotate, flatten any
    transparency onto white (a .convert("RGB") straight off an alpha
    channel leaves black artifacts — no real meaning for a vehicle photo
    anyway). Returns None for animated GIF/WEBP (would collapse to one
    frame) or anything that fails to decode — callers keep the original
    bytes/extension in that case."""
    try:
        img = Image.open(io.BytesIO(content))
        if getattr(img, "is_animated", False):
            return None
        img = ImageOps.exif_transpose(img)
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        return img
    except Exception:
        return None


def _encode(img: Image.Image, max_dimension: int, fmt: str, quality: int) -> bytes:
    resized = img.copy()
    resized.thumbnail((max_dimension, max_dimension), Image.LANCZOS)
    out = io.BytesIO()
    resized.save(out, format=fmt, quality=quality)
    return out.getvalue()


def resize_and_recompress(
    content: bytes,
    max_dimension: int = DEFAULT_MAX_DIMENSION,
    quality: int = DEFAULT_QUALITY,
) -> Optional[bytes]:
    """Downscale to `max_dimension` on the long side (never upscales) and
    recompress as JPEG. Returns None if the image is animated or can't be
    decoded — see `_prepare()`.

    Shared by the upload endpoint (vehicle_photos.py) and the one-off
    backfill script (backfill_vehicle_photo_sizes.py) so both apply the
    exact same transformation, never two copies that drift apart.
    """
    img = _prepare(content)
    if img is None:
        return None
    return _encode(img, max_dimension, "JPEG", quality)


class ResponsiveVariants(TypedDict):
    full_jpg: bytes
    full_webp: bytes
    card_jpg: bytes
    card_webp: bytes


def generate_responsive_variants(content: bytes) -> Optional[ResponsiveVariants]:
    """Same decode/normalize pass as `resize_and_recompress`, but produces
    every size/format pair the frontend's <picture>/srcset needs in one
    call: a full JPEG (unchanged from `resize_and_recompress`'s own
    output — same dimension/quality), a full WebP (smaller than JPEG at
    equivalent visual quality, no new dependency — Pillow's WebP support
    is built in, unlike AVIF which would need a new package), and a
    "card" tier sized for the catalog grid (vehicle cards render at
    ~250px — today's 1600px full photo is 6x more pixels than any card
    ever displays). Returns None under the same conditions as
    `resize_and_recompress` (animated/undecodable) — callers keep just
    the original file in that case, no derived variants.
    """
    img = _prepare(content)
    if img is None:
        return None
    return {
        "full_jpg": _encode(img, DEFAULT_MAX_DIMENSION, "JPEG", DEFAULT_QUALITY),
        "full_webp": _encode(img, DEFAULT_MAX_DIMENSION, "WEBP", 80),
        "card_jpg": _encode(img, CARD_MAX_DIMENSION, "JPEG", CARD_QUALITY),
        "card_webp": _encode(img, CARD_MAX_DIMENSION, "WEBP", 78),
    }


class VariantFileNames(TypedDict):
    full_webp: str
    card_jpg: str
    card_webp: str


def variant_file_names(jpg_file_name: str) -> VariantFileNames:
    """Given the DB-stored `file_name` (the full JPEG, e.g. "<uuid>.jpg"),
    return the on-disk names for its derived variants — pure string
    convention, no extra DB column needed. Same convention duplicated in
    the frontend (utils/photoVariants.ts) wherever a photo's
    <picture>/srcset is built from its `file_name` — keep both in sync if
    this ever changes.
    """
    base = jpg_file_name.rsplit(".", 1)[0]
    return {
        "full_webp": f"{base}.webp",
        "card_jpg": f"{base}-card.jpg",
        "card_webp": f"{base}-card.webp",
    }
