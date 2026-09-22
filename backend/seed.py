"""Development seed script for Studio Barking Dog Growth Engine (Pass 1).

Creates an initial administrator user and explicitly fictional demo companies.
All demo data is clearly marked as 'Demo' or 'Fictional' as required by Pass 1 specifications.
"""
import sys
import os

# Append project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.database import SessionLocal
from backend.app.models.user import User
from backend.app.models.company import Company, CompanyStatus, OpportunityLevel
from backend.app.models.activity import Activity
from backend.app.core.security import get_password_hash
from backend.app.services.company_service import CompanyService
from backend.app.schemas.company import CompanyCreate
from backend.app.services.auth_service import AuthService
from backend.app.core.config import settings

DEMO_COMPANIES = [
    {
        "name": "Demo Engineering Ltd",
        "website_url": "https://demo-engineering.example.com",
        "domain": "demo-engineering.example.com",
        "industry": "Industrial & Manufacturing",
        "sub_industry": "Precision Machining",
        "country": "United Kingdom",
        "state": "Greater London",
        "city": "London",
        "employee_range": "50-249",
        "revenue_range": "£10M - £25M",
        "description": "Fictional demo company specializing in precision robotics components and CAD automation software.",
        "linkedin_url": "https://linkedin.com/company/demo-engineering-ltd",
        "status": CompanyStatus.NEW.value,
        "opportunity_level": OpportunityLevel.HIGH.value
    },
    {
        "name": "Demo Healthcare Ltd",
        "website_url": "https://demo-healthcare.example.com",
        "domain": "demo-healthcare.example.com",
        "industry": "Healthcare & Life Sciences",
        "sub_industry": "Telehealth Platform",
        "country": "United Kingdom",
        "state": "West Midlands",
        "city": "Birmingham",
        "employee_range": "10-49",
        "revenue_range": "£2M - £5M",
        "description": "Fictional digital clinic providing patient triage and clinician scheduling systems.",
        "linkedin_url": "https://linkedin.com/company/demo-healthcare-ltd",
        "status": CompanyStatus.NEEDS_REVIEW.value,
        "opportunity_level": OpportunityLevel.MEDIUM.value
    },
    {
        "name": "Demo Furniture Ltd",
        "website_url": "https://demo-furniture.example.com",
        "domain": "demo-furniture.example.com",
        "industry": "Retail & E-Commerce",
        "sub_industry": "Direct-to-Consumer Home Goods",
        "country": "United States",
        "state": "New York",
        "city": "Brooklyn",
        "employee_range": "20-99",
        "revenue_range": "$5M - $15M",
        "description": "Fictional sustainable furniture brand with legacy monolithic e-commerce infrastructure.",
        "linkedin_url": "https://linkedin.com/company/demo-furniture-ltd",
        "status": CompanyStatus.QUALIFIED.value,
        "opportunity_level": OpportunityLevel.HIGH.value
    },
    {
        "name": "Demo Logistics Solutions Ltd",
        "website_url": "https://demo-logistics.example.com",
        "domain": "demo-logistics.example.com",
        "industry": "Transportation & Logistics",
        "sub_industry": "Cold Chain Telematics",
        "country": "United Kingdom",
        "state": "Greater Manchester",
        "city": "Manchester",
        "employee_range": "100-499",
        "revenue_range": "£25M - £50M",
        "description": "Fictional fleet freight tracking and temperature telematics vendor seeking legacy web portal rebuild.",
        "linkedin_url": "https://linkedin.com/company/demo-logistics-ltd",
        "status": CompanyStatus.RESEARCHING.value,
        "opportunity_level": OpportunityLevel.LOW.value
    },
    {
        "name": "Demo Retail Labs Ltd",
        "website_url": "https://demo-retail-labs.example.com",
        "domain": "demo-retail-labs.example.com",
        "industry": "Retail & E-Commerce",
        "sub_industry": "Point-of-Sale Integrations",
        "country": "United States",
        "state": "California",
        "city": "San Francisco",
        "employee_range": "5-19",
        "revenue_range": "$1M - $3M",
        "description": "Fictional omnichannel point-of-sale middleware for boutique high-street merchants.",
        "linkedin_url": "https://linkedin.com/company/demo-retail-labs-ltd",
        "status": CompanyStatus.NEW.value,
        "opportunity_level": None
    }
]


def seed_database():
    print("Connecting to database (Alembic managed schema)...")
    db = SessionLocal()

    admin_email = os.getenv("ADMIN_EMAIL", settings.ADMIN_EMAIL)
    admin_password = os.getenv("ADMIN_PASSWORD", settings.ADMIN_PASSWORD)

    if not admin_password:
        print("ERROR: ADMIN_PASSWORD environment variable is not set.")
        print("Please copy .env.example to .env and configure ADMIN_EMAIL and ADMIN_PASSWORD before running seed.py.")
        sys.exit(1)

    try:
        # 1. Seed or ensure admin team member
        admin = AuthService.ensure_initial_admin(db, email=admin_email, password=admin_password)
        print(f"✓ Initial Administrator created/verified: {admin.email}")

        # 2. Seed fictional demo companies
        created_count = 0
        for comp_data in DEMO_COMPANIES:
            existing = db.query(Company).filter(Company.name == comp_data["name"]).first()
            if not existing:
                create_dto = CompanyCreate(**comp_data)
                comp = CompanyService.create(db, create_dto, created_by=admin.name)
                created_count += 1
                print(f"✓ Seeded demo company: {comp.name} [{comp.status}]")
            else:
                print(f"• Already exists: {comp_data['name']}")

        print(f"\nSeed complete. Added {created_count} demo companies.")
        print(f"Administrator team member email: {admin.email}")
        print("Password configured via ADMIN_PASSWORD environment variable.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
