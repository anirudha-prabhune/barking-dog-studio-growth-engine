import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from backend.app.main import app
from backend.app.core.database import Base, get_db
from backend.app.core.config import settings

# Test database (isolated test execution)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    # Seed initial test admin
    from backend.app.services.auth_service import AuthService
    db = TestingSessionLocal()
    AuthService.ensure_initial_admin(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.DEFAULT_ADMIN_EMAIL, "password": settings.DEFAULT_ADMIN_PASSWORD}
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
        json={"email": settings.DEFAULT_ADMIN_EMAIL, "password": settings.DEFAULT_ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

    # Invalid credentials
    bad_resp = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.DEFAULT_ADMIN_EMAIL, "password": "WrongPassword123"}
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

