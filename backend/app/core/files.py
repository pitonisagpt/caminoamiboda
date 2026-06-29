from pathlib import Path

from fastapi import HTTPException


def safe_pdf_path(pdf_path: str, base_dir: Path) -> Path:
    resolved = Path(pdf_path).resolve()
    if not resolved.is_relative_to(base_dir.resolve()):
        raise HTTPException(status_code=403, detail="Ruta de archivo no autorizada")
    return resolved
