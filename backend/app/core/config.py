import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional, List, Union
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    PROJECT_NAME: str = "Barking Dog Growth Engine"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Security - No hardcoded fallback secret
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/barking_dog_growth"
    
    # Redis Cache & Future Job Queue
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Initial team administrator credentials - No hardcoded password defaults
    ADMIN_EMAIL: str = "admin@barkingdog.studio"
    ADMIN_PASSWORD: Optional[str] = None
    
    # Configured Frontend Origins for CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://127.0.0.1:3000"
    CORS_ORIGIN_REGEX: Optional[str] = r"^https:\/\/.*\.run\.app$"

    @property
    def parsed_cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if isinstance(self.CORS_ORIGINS, str):
            val = self.CORS_ORIGINS.strip()
            if val.startswith("[") and val.endswith("]"):
                import json
                try:
                    return json.loads(val)
                except Exception:
                    pass
            return [origin.strip() for origin in val.split(",") if origin.strip()]
        return ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
