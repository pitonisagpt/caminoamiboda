"""
Generador de contenido con IA para el botón "Generar con IA" del form de
vehículos. Usa Claude (visión) para redactar la descripción para novias
(ES + EN) y las 5 puntuaciones, a partir de las fotos visibles del
vehículo + un par de vehículos reales ya publicados como ejemplo de tono.

Admin-only, disparado a mano por vehículo, bajo volumen — a diferencia de
ai_assistant_service.py (superficie pública sin autenticar, alto volumen),
NO necesita circuit breaker ni presupuesto diario. Un error claro que el
admin pueda reintentar es suficiente.

Nunca escribe en la base de datos — devuelve el contenido generado para
que el router lo entregue al frontend, que llena el formulario ya abierto
vía setValue() de react-hook-form. El guardado real sigue pasando por el
PUT /api/vehicles/{id} existente, sin tocar.
"""
from __future__ import annotations

import base64
from pathlib import Path
from typing import Optional

import anthropic
import filetype
from sqlalchemy.orm import Session

from app.config import settings
from app.models.vehicle import Vehicle
from app.models.vehicle_photo import VehiclePhoto
from app.schemas.vehicle_ai import VehicleAiFields

# Mismo UPLOAD_DIR que vehicle_photos.py. Se leen los archivos directo del
# disco en vez de mandar la URL pública — build_upload_url() da una ruta
# *relativa* cuando PUBLIC_BACKEND_URL no está seteada (el caso en local),
# inalcanzable para Anthropic. Leer el archivo funciona igual en local y prod.
UPLOAD_DIR = Path("/app/uploads/vehicles")

MODEL = "claude-opus-5"
MAX_TOKENS = 16000
MAX_PHOTOS = 5
FEW_SHOT_LIMIT = 3

_CATEGORY_LABEL = {"clasico": "clásico", "vintage": "vintage", "moderno": "moderno"}
_LOCATION_LABEL = {
    "medellin": "Medellín",
    "rionegro": "Rionegro/Llanogrande",
    "carmen_de_viboral": "El Carmen de Viboral",
}


class VehicleAiError(Exception):
    """Lleva un error con forma HTTP hacia el router sin importar FastAPI
    en este módulo (mismo criterio que ai_assistant_service.py)."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def _ai_configured() -> bool:
    return bool(settings.anthropic_api_key)


def _select_photos(db: Session, vehicle_id: int) -> list[VehiclePhoto]:
    return (
        db.query(VehiclePhoto)
        .filter(VehiclePhoto.vehicle_id == vehicle_id, VehiclePhoto.is_visible == True)  # noqa: E712
        .order_by(VehiclePhoto.display_order)
        .limit(MAX_PHOTOS)
        .all()
    )


def _photo_to_image_block(photo: VehiclePhoto) -> Optional[dict]:
    path = UPLOAD_DIR / photo.file_name
    try:
        data = path.read_bytes()
    except OSError:
        return None  # fila en BD pero archivo faltante en disco — se salta, no rompe todo
    kind = filetype.guess(data)
    media_type = kind.mime if kind and kind.mime.startswith("image/") else "image/jpeg"
    return {
        "type": "image",
        "source": {"type": "base64", "media_type": media_type, "data": base64.standard_b64encode(data).decode("ascii")},
    }


def _fetch_few_shot_examples(db: Session, exclude_vehicle_id: int) -> list[Vehicle]:
    return (
        db.query(Vehicle)
        .filter(
            Vehicle.id != exclude_vehicle_id,
            Vehicle.bride_description.isnot(None),
            Vehicle.bride_description != "",
            Vehicle.score_elegance.isnot(None),
            Vehicle.score_exclusivity.isnot(None),
            Vehicle.score_photogeny.isnot(None),
            Vehicle.score_comfort.isnot(None),
            Vehicle.score_romance.isnot(None),
        )
        .order_by(Vehicle.updated_at.desc())
        .limit(FEW_SHOT_LIMIT)
        .all()
    )


def _format_example(v: Vehicle) -> str:
    category = _CATEGORY_LABEL.get(v.category.value if v.category else None, "sin categoría")
    lines = [
        f'- {v.brand} {v.model_line or ""}'.strip() + f" ({category}, {v.year or 'año no especificado'})",
        f'  Descripción (ES): "{v.bride_description}"',
    ]
    if v.bride_description_en:
        lines.append(f'  Descripción (EN): "{v.bride_description_en}"')
    lines.append(
        f"  Puntuaciones: elegancia {v.score_elegance}, exclusividad {v.score_exclusivity}, "
        f"fotogenia {v.score_photogeny}, comodidad {v.score_comfort}, romance {v.score_romance}"
    )
    return "\n".join(lines)


def build_system_prompt(examples: list[Vehicle]) -> str:
    examples_block = (
        "\n\n".join(_format_example(v) for v in examples)
        if examples
        else "(todavía no hay vehículos con descripción y puntuaciones completas — usa tu propio criterio)"
    )
    return f"""Eres redactor de marketing y evaluador de flota para Camino a mi Boda, una empresa de alquiler de carros y motos clásicos, vintage y modernos para bodas en Medellín, el área metropolitana y el oriente antioqueño (Rionegro/Llanogrande, El Carmen de Viboral).

TU TAREA
Para el vehículo que te va a describir el usuario (con fotos reales cuando estén disponibles), debes generar:
1. Un párrafo en español para "Descripción para novias" — el texto que aparece en el catálogo público, dentro del popup de cada vehículo.
2. La misma descripción en inglés (no es traducción literal palabra por palabra; es el mismo mensaje, con tono natural para una lectora angloparlante).
3. Cinco puntuaciones de 1 a 5: elegancia y estilo, exclusividad y rareza, fotogenia, comodidad y espacio, romanticismo y encanto.

CÓMO ESCRIBIR LA DESCRIPCIÓN
- Lenguaje cálido, cercano y evocador — nunca una ficha técnica. Habla de cómo se siente ver o subirse a este vehículo el día de la boda, para qué tipo de novia o de boda encaja mejor.
- 4 a 6 frases. Sin precios, sin datos de contacto, sin nombres de propietarios, sin emojis, sin superlativos vacíos.
- Basa la descripción en lo que realmente ves en las fotos (color, líneas, interior, detalles) y en los datos del vehículo. Si no hay fotos, sé más genérico apoyándote solo en los datos, sin inventar detalles visuales.

CÓMO PUNTUAR (1 = bajo, 5 = muy alto, dentro de la flota de esta empresa)
- Elegancia y estilo: líneas, proporciones, presencia general.
- Exclusividad y rareza: qué tan poco común es este modelo/año dentro de la flota.
- Fotogenia: qué tan bien luce en fotografías de boda.
- Comodidad y espacio: espacio interior, facilidad de subir con vestido de novia.
- Romanticismo y encanto: qué tanto evoca una atmósfera romántica o nostálgica.
Sé honesto y variado — no le des 5 a todo. Los ejemplos reales de abajo muestran el criterio ya calibrado para esta flota.

EJEMPLOS REALES YA PUBLICADOS (para calibrar tono y puntuaciones — no los copies)
{examples_block}

FORMATO
Responde únicamente con los campos solicitados; no agregues texto fuera de esos campos."""


def _vehicle_context_text(vehicle: Vehicle, has_photos: bool) -> str:
    category = _CATEGORY_LABEL.get(vehicle.category.value if vehicle.category else None, "sin categoría")
    location = _LOCATION_LABEL.get(vehicle.location.value, vehicle.location.value)
    lines = [
        "Vehículo a describir:",
        f"- Marca: {vehicle.brand}",
        f"- Línea/modelo: {vehicle.model_line or 'no especificado'}",
        f"- Año: {vehicle.year or 'no especificado'}",
        f"- Color: {vehicle.color or 'no especificado'}",
        f"- Categoría: {category}",
        f"- Tipo de carrocería: {vehicle.body_type or 'no especificado'}",
        f"- Tipo: {'carro' if vehicle.vehicle_type.value == 'car' else 'moto'}",
        f"- Ubicación: {location}",
    ]
    if not has_photos:
        lines.append(
            "\nNota: este vehículo no tiene fotos visibles disponibles. Genera la descripción "
            "apoyándote solo en estos datos, sin inventar detalles visuales, y sé conservador con "
            "la puntuación de fotogenia ya que no hay una foto real que evaluar."
        )
    return "\n".join(lines)


def generate_vehicle_ai_content(db: Session, vehicle: Vehicle) -> dict:
    if not _ai_configured():
        raise VehicleAiError(503, "La generación con IA no está configurada (falta ANTHROPIC_API_KEY).")

    photos = _select_photos(db, vehicle.id)
    image_blocks = [b for b in (_photo_to_image_block(p) for p in photos) if b is not None]
    used_photos = len(image_blocks) > 0

    examples = _fetch_few_shot_examples(db, exclude_vehicle_id=vehicle.id)
    system_prompt = build_system_prompt(examples)
    user_content = image_blocks + [{"type": "text", "text": _vehicle_context_text(vehicle, has_photos=used_photos)}]

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.parse(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}],
            output_format=VehicleAiFields,
        )
    # Nunca 401/403 puros hacia el router — el interceptor de axios del
    # frontend (api/index.ts) redirige a /login en CUALQUIER 401 que no sea
    # la sonda de /auth/me, así que un fallo de auth con Anthropic no debe
    # tumbar la sesión del admin a medias de editar. Se remapean a 502
    # ("algo nuestro falló arriba"), 429 sí se deja pasar tal cual (es
    # genuinamente reintentable).
    except anthropic.AuthenticationError as e:
        raise VehicleAiError(502, "La IA no está disponible en este momento (credenciales inválidas). Contacta al equipo técnico.") from e
    except anthropic.PermissionDeniedError as e:
        raise VehicleAiError(502, "La IA no está disponible en este momento (permiso denegado). Contacta al equipo técnico.") from e
    except anthropic.RateLimitError as e:
        raise VehicleAiError(429, "Demasiadas solicitudes a la IA en este momento. Espera un minuto e intenta de nuevo.") from e
    except anthropic.APIConnectionError as e:
        raise VehicleAiError(502, "No se pudo conectar con el servicio de IA. Intenta de nuevo.") from e
    except anthropic.APIStatusError as e:
        raise VehicleAiError(502, f"El servicio de IA respondió con un error ({e.status_code}). Intenta de nuevo.") from e

    fields = response.parsed_output
    return {**fields.model_dump(), "used_photos": used_photos}
