from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/caminoamiboda"

    company_name: str = "Camino a mi Boda"
    company_owner: str = "Juan Camilo Yepes Correa"
    company_phone: str = "+(57) 314 737 2030"
    company_cc: str = "1040735268"
    bank_name: str = "Bancolombia"
    bank_account: str = "00484248273"
    city: str = "Medellín"

    pdf_storage_path: str = "generated_pdfs"

    secret_key: str = "change-me-in-production-use-a-random-32-byte-hex"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    class Config:
        env_file = ".env"


settings = Settings()
