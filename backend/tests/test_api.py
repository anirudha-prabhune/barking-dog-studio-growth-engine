import os
import sys
import pytest

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from alembic.config import Config
from alembic import command
from backend.app.main import app
from backend.app.core.database import Base, get_db
from backend.app.core.config import settings
from backend.app.services.auth_service import AuthService

# Test database configuration
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/barking_dog_test"
)

# Test environment credentials
TEST_ADMIN_EMAIL = "admin@barkingdog.studio"
TEST_ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD") or settings.ADMIN_PASSWORD or "BarkingDog2026!Secure"
TEST_SECRET_KEY = os.getenv("TEST_SECRET_KEY") or settings.SECRET_KEY or "bdge-super-secure-dev-session-key-barking-dog-2026-production-ready"

settings.SECRET_KEY = TEST_SECRET_KEY

# Setup test engine (with PostgreSQL reachability check and SQLite fallback for test runner)
def _create_test_engine():
    if TEST_DATABASE_URL.startswith("postgresql://") or TEST_DATABASE_URL.startswith("postgres://"):
        try:
            pg_engine = create_engine(TEST_DATABASE_URL, connect_args={"connect_timeout": 1}, pool_pre_ping=True)
            with pg_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return pg_engine, False
        except Exception:
            pass
    # Fallback to in-memory/file SQLite for test isolation
    test_sqlite_url = "sqlite:///./test.db"
    return create_engine(test_sqlite_url, connect_args={"check_same_thread": False}, pool_pre_ping=True), True

engine, is_sqlite_test = _create_test_engine()
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def apply_alembic_migrations():
    """Apply schema migrations to test database."""
    if not is_sqlite_test:
        alembic_ini_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "migrations", "alembic.ini")
        )
        script_location = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "migrations")
        )
        alembic_cfg = Config(alembic_ini_path)
        alembic_cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
        alembic_cfg.set_main_option("script_location", script_location)
        command.upgrade(alembic_cfg, "head")
    else:
        from backend.app.models import User, Company, Activity, AgentRun, Evidence
        Base.metadata.create_all(bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    db = TestingSessionLocal()
    try:
        # Clear tables in reverse dependency order for isolated test execution
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
        # Seed test admin with configured test password
        AuthService.ensure_initial_admin(db, email=TEST_ADMIN_EMAIL, password=TEST_ADMIN_PASSWORD)
    finally:
        db.close()
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "redis" in data
    assert "service" in data


def test_authentication(client):
    # Valid credentials
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

    # Invalid credentials
    bad_resp = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": "WrongPassword123"}
    )
    assert bad_resp.status_code == 401


def test_company_lifecycle(client, auth_headers):
    # 1. Create company
    create_payload = {
        "name": "Acme Dynamics Demo Ltd",
        "website_url": "https://acme-dynamics.example.com",
        "industry": "Software & Digital",
        "city": "London",
        "country": "United Kingdom",
        "employee_range": "20-99"
    }
    create_resp = client.post(f"{settings.API_V1_STR}/companies", json=create_payload, headers=auth_headers)
    assert create_resp.status_code == 201
    created_company = create_resp.json()
    company_id = created_company["id"]
    assert created_company["name"] == "Acme Dynamics Demo Ltd"
    assert created_company["domain"] == "acme-dynamics.example.com"
    assert created_company["is_archived"] is False

    # 2. Retrieve company
    get_resp = client.get(f"{settings.API_V1_STR}/companies/{company_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == company_id

    # 3. Update company
    update_payload = {"city": "Manchester", "employee_range": "100-249"}
    patch_resp = client.patch(f"{settings.API_V1_STR}/companies/{company_id}", json=update_payload, headers=auth_headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["city"] == "Manchester"
    assert patch_resp.json()["employee_range"] == "100-249"

    # 4. Archive company
    archive_resp = client.post(f"{settings.API_V1_STR}/companies/{company_id}/archive", headers=auth_headers)
    assert archive_resp.status_code == 200
    assert archive_resp.json()["is_archived"] is True

    # 5. Verify company excluded from default list
    list_resp = client.get(f"{settings.API_V1_STR}/companies", headers=auth_headers)
    assert list_resp.status_code == 200
    item_ids = [item["id"] for item in list_resp.json()["items"]]
    assert company_id not in item_ids

    # 6. Verify company included when include_archived=true
    archived_list_resp = client.get(f"{settings.API_V1_STR}/companies?include_archived=true", headers=auth_headers)
    assert archived_list_resp.status_code == 200
    archived_ids = [item["id"] for item in archived_list_resp.json()["items"]]
    assert company_id in archived_ids

    # 7. Restore company using canonical POST /api/companies/{id}/restore
    restore_resp = client.post(f"{settings.API_V1_STR}/companies/{company_id}/restore", headers=auth_headers)
    assert restore_resp.status_code == 200
    assert restore_resp.json()["is_archived"] is False

    # 8. Verify company back in default active list
    restored_list_resp = client.get(f"{settings.API_V1_STR}/companies", headers=auth_headers)
    assert restored_list_resp.status_code == 200
    restored_ids = [item["id"] for item in restored_list_resp.json()["items"]]
    assert company_id in restored_ids


def test_admin_bootstrap_does_not_overwrite_existing_password():
    db = TestingSessionLocal()
    try:
        user = AuthService.get_by_email(db, TEST_ADMIN_EMAIL)
        assert user is not None
        original_hash = user.password_hash

        # Re-running ensure_initial_admin must not overwrite existing password hash
        updated_user = AuthService.ensure_initial_admin(
            db, email=TEST_ADMIN_EMAIL, password="BrandNewDifferentPassword999!"
        )
        assert updated_user.password_hash == original_hash
    finally:
        db.close()


