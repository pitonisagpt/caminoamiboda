from pydantic import BaseModel, Field


class VehicleAiFields(BaseModel):
    """Entregado a Claude como output_format — las descripciones de cada
    campo también sirven de instrucción para el modelo."""

    bride_description: str = Field(
        description=(
            "Párrafo en español, cálido y evocador (4 a 6 frases), para el catálogo público que "
            "ven las novias. Describe cómo se siente este carro/moto el día de la boda, no una "
            "ficha técnica. Sin precios, sin datos de contacto, sin emojis."
        )
    )
    bride_description_en: str = Field(
        description=(
            "The same paragraph in English — same warm tone and length, not a literal "
            "word-for-word translation, adapted naturally for an English-speaking bride."
        )
    )
    score_elegance: int = Field(ge=1, le=5, description="Elegancia y estilo, 1 a 5.")
    score_exclusivity: int = Field(ge=1, le=5, description="Exclusividad y rareza, 1 a 5.")
    score_photogeny: int = Field(ge=1, le=5, description="Fotogenia, 1 a 5.")
    score_comfort: int = Field(ge=1, le=5, description="Comodidad y espacio, 1 a 5.")
    score_romance: int = Field(ge=1, le=5, description="Romanticismo y encanto, 1 a 5.")


class VehicleAiGenerateResponse(VehicleAiFields):
    used_photos: bool  # hecho determinístico nuestro, no algo que Claude decide
