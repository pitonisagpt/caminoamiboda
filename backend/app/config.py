from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/caminoamiboda"

    company_name: str = "Camino a mi Boda"
    company_owner: str = "Juan Camilo Yepes Correa"
    company_phone: str = "+(57) 314 737 2030"
    company_cc: str = ""
    bank_name: str = "Bancolombia"
    bank_account: str = ""
    city: str = "Medellín"

    pdf_storage_path: str = "generated_pdfs"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_refresh_token: str = ""
    google_calendar_id: str = "primary"
    google_calendar_prospectos: str = ""
    google_calendar_pendiente: str = ""
    google_calendar_abono: str = ""
    google_calendar_ok: str = ""
    google_calendar_obsequio: str = ""
    google_calendar_publicidad: str = ""

    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    frontend_url: str = "http://localhost:5173"
    initial_admin_password: str = ""

    secret_key: str = "change-me-in-production-use-a-random-32-byte-hex"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    class Config:
        env_file = ".env"


settings = Settings()
