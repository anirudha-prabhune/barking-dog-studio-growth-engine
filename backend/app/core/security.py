from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import hashlib
import os
import hmac
from jose import jwt
from backend.app.core.config import settings


def get_password_hash(password: str) -> str:
    """Secure password hashing using PBKDF2 with SHA-256 and unique salt."""
    salt = os.urandom(16).hex()
    hash_bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}:{hash_bytes.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against salt:hash format."""
    try:
        if ":" not in hashed_password:
            return False
        salt, expected_hash = hashed_password.split(":", 1)
        hash_bytes = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return hmac.compare_digest(hash_bytes.hex(), expected_hash)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
