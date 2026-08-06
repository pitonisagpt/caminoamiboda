from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/caminoamiboda"

    company_name: str = "Camino a mi Boda"
    company_owner: str = "Juan Camilo Yepes Correa"
    company_phone: str = "+(57) 314 737 2030"
    company_cc: str = ""
    company_cc_city: str = "Medellín"
    company_address: str = ""
    company_email: str = ""
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
    google_calendar_cancelados: str = ""
    google_calendar_clientes: str = ""
    google_calendar_prereserva: str = ""
    google_calendar_team: str = ""

    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    frontend_url: str = "http://localhost:5173"
    public_backend_url: str = ""
    initial_admin_password: str = ""

    secret_key: str = "change-me-in-production-use-a-random-32-byte-hex"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    cookie_secure: bool = False

    anthropic_api_key: str = ""
    ai_assistant_model: str = "claude-haiku-4-5"
    ai_assistant_max_tokens: int = 500
    ai_assistant_max_turns_per_session: int = 20
    ai_assistant_daily_message_budget: int = 300
    ai_assistant_consecutive_error_threshold: int = 3

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    ops_notification_email: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
