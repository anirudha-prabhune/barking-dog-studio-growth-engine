import os
import sqlite3
import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.core.config import settings

logger = logging.getLogger("barking_dog")

Base = declarative_base()


def create_db_engine():
    db_url = settings.DATABASE_URL
    is_postgres = db_url.startswith("postgresql://") or db_url.startswith("postgres://")
    
    if is_postgres:
        try:
            # Quick reachability check with a 1.5s timeout
            test_engine = create_engine(
                db_url,
                connect_args={"connect_timeout": 2},
                pool_pre_ping=True
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to PostgreSQL database.")
            return create_engine(db_url, pool_pre_ping=True, pool_size=10, max_overflow=20)
        except Exception as exc:
            logger.warning(
                f"PostgreSQL connection to {db_url} failed ({exc}). "
                "Falling back to local SQLite database."
            )
            return _create_sqlite_engine()
    else:
        return _create_sqlite_engine(db_url)


def _create_sqlite_engine(custom_url: str = None):
    if custom_url and custom_url.startswith("sqlite"):
        sqlite_url = custom_url
    else:
        db_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../../../barking_dog_growth.db")
        )
        sqlite_url = f"sqlite:///{db_path}"

    logger.info(f"Using SQLite database engine at {sqlite_url}")
    eng = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )

    @event.listens_for(eng, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if isinstance(dbapi_connection, sqlite3.Connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return eng


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Ensure database schema is created and initial admin exists."""
    from backend.app.models.user import User
    from backend.app.models.company import Company
    from backend.app.models.activity import Activity
    from backend.app.models.agent_run import AgentRun
    from backend.app.models.evidence import Evidence

    # Create tables if they do not exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema verified/created.")

    # Verify or initialize admin user
    with SessionLocal() as db:
        admin_email = settings.ADMIN_EMAIL
        admin_password = settings.ADMIN_PASSWORD
        if admin_password:
            try:
                from backend.app.services.auth_service import AuthService
                admin = AuthService.ensure_initial_admin(db, email=admin_email, password=admin_password)
                logger.info(f"Verified initial admin user: {admin.email}")
            except Exception as e:
                logger.error(f"Failed to ensure initial admin user: {e}")
                db.rollback()

        # Check if companies exist; if empty, seed demo companies so the app is immediately usable
        try:
            company_count = db.query(Company).count()
            if company_count == 0:
                from backend.seed import DEMO_COMPANIES
                from backend.app.services.company_service import CompanyService
                from backend.app.schemas.company import CompanyCreate
                seeded = 0
                for comp_data in DEMO_COMPANIES:
                    create_dto = CompanyCreate(**comp_data)
                    CompanyService.create(db, create_dto, created_by="System Seed")
                    seeded += 1
                logger.info(f"Seeded {seeded} initial demo companies.")
        except Exception as e:
            logger.warning(f"Demo companies check/seed notice: {e}")
            db.rollback()
