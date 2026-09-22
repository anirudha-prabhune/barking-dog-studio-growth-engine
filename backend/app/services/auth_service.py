from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.core.security import verify_password, get_password_hash
from backend.app.core.config import settings
from backend.app.models.base import utc_now


class AuthService:
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.strip().lower()).first()

    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> Optional[User]:
        user = AuthService.get_by_email(db, email)
        if not user:
            return None
        if not user.is_active:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    @staticmethod
    def ensure_initial_admin(db: Session, email: Optional[str] = None, password: Optional[str] = None) -> User:
        admin_email = (email or settings.ADMIN_EMAIL or settings.DEFAULT_ADMIN_EMAIL).strip().lower()
        admin_password = password or settings.ADMIN_PASSWORD or settings.DEFAULT_ADMIN_PASSWORD
        if not admin_password:
            raise ValueError(
                "ADMIN_PASSWORD is required. Please set ADMIN_PASSWORD in your .env file."
            )
        admin = AuthService.get_by_email(db, admin_email)
        if not admin:
            admin = User(
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                name="Studio Administrator",
                is_active=True,
                created_at=utc_now(),
                updated_at=utc_now()
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        else:
            admin.password_hash = get_password_hash(admin_password)
            admin.updated_at = utc_now()
            db.commit()
            db.refresh(admin)
        return admin
