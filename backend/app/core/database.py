import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.core.config import settings

logger = logging.getLogger("barking_dog")

Base = declarative_base()


def init_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql"):
        try:
            # Test connectivity to primary PostgreSQL database with a fast timeout
            test_engine = create_engine(
                db_url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 2}
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            test_engine.dispose()
            logger.info("Connected to primary PostgreSQL database successfully.")
            return create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20
            )
        except Exception as e:
            logger.warning(
                f"Primary PostgreSQL at {db_url} is unreachable ({e}). "
                "Falling back to local SQLite database (sqlite:///./growth_engine.db) for development/preview."
            )
            fallback_engine = create_engine(
                "sqlite:///./growth_engine.db",
                connect_args={"check_same_thread": False}
            )
            # In SQLite fallback mode, import models and ensure tables exist
            import backend.app.models  # noqa: F401
            Base.metadata.create_all(bind=fallback_engine)
            return fallback_engine
    elif db_url.startswith("sqlite"):
        return create_engine(db_url, connect_args={"check_same_thread": False})
    
    return create_engine(db_url, pool_pre_ping=True)


engine = init_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
