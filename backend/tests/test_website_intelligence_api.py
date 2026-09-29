import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.core.database import Base, get_db
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.models.company import Company
from backend.app.models.website_scan import WebsiteScan, ScanStatus
from backend.app.models.website_page import WebsitePage
from backend.app.services.auth_service import AuthService

# Use sqlite test engine
test_sqlite_url = "sqlite:///./test.db"
engine = create_engine(test_sqlite_url, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

TEST_ADMIN_EMAIL = "admin@barkingdog.studio"
TEST_ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD") or settings.ADMIN_PASSWORD or "BarkingDog2026!Secure"


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as db:
        AuthService.ensure_initial_admin(db, email=TEST_ADMIN_EMAIL, password=TEST_ADMIN_PASSWORD)
    yield


@pytest.fixture
def auth_headers():
    res = client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_company():
    with TestingSessionLocal() as db:
        company = db.query(Company).filter(Company.name == "Scan Test Org").first()
        if not company:
            company = Company(
                name="Scan Test Org",
                website_url="https://example.com",
                domain="example.com"
            )
            db.add(company)
            db.commit()
            db.refresh(company)
        return company.id


def test_trigger_scan_ssrf_rejection(auth_headers, sample_company):
    # Attempting to scan loopback address must be blocked with HTTP 400
    res = client.post(
        f"/api/companies/{sample_company}/scans",
        json={"url": "http://127.0.0.1:8000/internal"},
        headers=auth_headers
    )
    assert res.status_code == 400
    data = res.json()
    assert data["error"]["code"] == "SSRF_VIOLATION"


def test_trigger_scan_localhost_rejection(auth_headers, sample_company):
    res = client.post(
        f"/api/companies/{sample_company}/scans",
        json={"url": "http://localhost/secret"},
        headers=auth_headers
    )
    assert res.status_code == 400
    data = res.json()
    assert data["error"]["code"] == "SSRF_VIOLATION"


def test_trigger_valid_scan_and_fetch_details(auth_headers, sample_company, monkeypatch):
    # Mock DNS resolution for example.com to avoid network failures in tests
    monkeypatch.setattr(
        "backend.app.services.url_safety.resolve_hostname_ips",
        lambda host, port=80: ["93.184.216.34"]
    )

    res = client.post(
        f"/api/companies/{sample_company}/scans",
        json={"url": "https://example.com"},
        headers=auth_headers
    )
    assert res.status_code == 202
    scan_data = res.json()
    assert scan_data["company_id"] == sample_company
    assert scan_data["status"] in ["PENDING", "RUNNING", "COMPLETED"]
    scan_id = scan_data["id"]

    # Fetch scan details
    detail_res = client.get(f"/api/scans/{scan_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == scan_id

    # List company scans
    list_res = client.get(f"/api/companies/{sample_company}/scans", headers=auth_headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1

    # List scan pages
    pages_res = client.get(f"/api/scans/{scan_id}/pages", headers=auth_headers)
    assert pages_res.status_code == 200
    assert "items" in pages_res.json()
