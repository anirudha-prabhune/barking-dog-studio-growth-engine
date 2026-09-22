from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from urllib.parse import urlparse
from backend.app.models.company import Company, CompanyStatus
from backend.app.models.activity import Activity
from backend.app.schemas.company import CompanyCreate, CompanyUpdate
from backend.app.services.activity_service import ActivityService
from backend.app.models.base import utc_now
import math


def extract_domain(url: str) -> Optional[str]:
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path.split('/')[0]
        if domain.startswith("www."):
            domain = domain[4:]
        return domain.lower() if domain else None
    except Exception:
        return None


class CompanyService:
    @staticmethod
    def list_companies(
        db: Session,
        search: Optional[str] = None,
        industry: Optional[str] = None,
        city: Optional[str] = None,
        status: Optional[str] = None,
        include_archived: bool = False,
        page: int = 1,
        page_size: int = 25
    ) -> Tuple[List[Company], int, int]:
        query = db.query(Company)

        if not include_archived:
            query = query.filter(Company.is_archived.is_(False))

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Company.name).like(term),
                    func.lower(Company.domain).like(term),
                    func.lower(Company.industry).like(term),
                    func.lower(Company.city).like(term)
                )
            )

        if industry and industry.strip() and industry.strip().upper() != "ALL":
            query = query.filter(func.lower(Company.industry) == industry.strip().lower())

        if city and city.strip() and city.strip().upper() != "ALL":
            query = query.filter(func.lower(Company.city) == city.strip().lower())

        if status and status.strip() and status.strip().upper() != "ALL":
            query = query.filter(Company.status == status.strip().upper())

        total = query.count()
        total_pages = math.ceil(total / page_size) if total > 0 else 0

        # Sort by latest created first
        items = query.order_by(desc(Company.created_at)).offset((page - 1) * page_size).limit(page_size).all()
        return items, total, total_pages

    @staticmethod
    def get_by_id(db: Session, company_id: str) -> Optional[Company]:
        return db.query(Company).filter(Company.id == company_id).first()

    @staticmethod
    def create(db: Session, data: CompanyCreate, created_by: str = "Admin") -> Company:
        domain = data.domain
        if not domain and data.website_url:
            domain = extract_domain(data.website_url)

        company = Company(
            name=data.name,
            website_url=data.website_url,
            domain=domain,
            industry=data.industry,
            sub_industry=data.sub_industry,
            country=data.country,
            state=data.state,
            city=data.city,
            employee_range=data.employee_range,
            revenue_range=data.revenue_range,
            description=data.description,
            linkedin_url=data.linkedin_url,
            status=data.status or CompanyStatus.NEW.value,
            opportunity_level=data.opportunity_level,
            is_archived=False,
            created_at=utc_now(),
            updated_at=utc_now()
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        # Record activity
        ActivityService.record_activity(
            db=db,
            company_id=company.id,
            activity_type="COMPANY_CREATED",
            description=f"Company '{company.name}' created by {created_by}.",
            metadata={"source": "manual_entry", "website": company.website_url},
            created_by=created_by
        )

        return company

    @staticmethod
    def update(db: Session, company_id: str, data: CompanyUpdate, updated_by: str = "Admin") -> Optional[Company]:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        if not update_dict:
            return company

        changes = {}
        for field, new_val in update_dict.items():
            old_val = getattr(company, field, None)
            if old_val != new_val:
                changes[field] = {"old": old_val, "new": new_val}
                setattr(company, field, new_val)

        if "website_url" in update_dict and not update_dict.get("domain"):
            new_domain = extract_domain(update_dict["website_url"])
            if new_domain:
                company.domain = new_domain

        company.updated_at = utc_now()
        db.commit()
        db.refresh(company)

        if changes:
            ActivityService.record_activity(
                db=db,
                company_id=company.id,
                activity_type="COMPANY_UPDATED",
                description=f"Company details updated ({', '.join(changes.keys())}) by {updated_by}.",
                metadata=changes,
                created_by=updated_by
            )

        return company

    @staticmethod
    def archive(db: Session, company_id: str, archived_by: str = "Admin") -> Optional[Company]:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            return None

        company.is_archived = True
        company.updated_at = utc_now()
        db.commit()
        db.refresh(company)

        ActivityService.record_activity(
            db=db,
            company_id=company.id,
            activity_type="COMPANY_ARCHIVED",
            description=f"Company '{company.name}' was archived by {archived_by}.",
            metadata={"is_archived": True},
            created_by=archived_by
        )
        return company

    @staticmethod
    def unarchive(db: Session, company_id: str, unarchived_by: str = "Admin") -> Optional[Company]:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            return None

        company.is_archived = False
        company.updated_at = utc_now()
        db.commit()
        db.refresh(company)

        ActivityService.record_activity(
            db=db,
            company_id=company.id,
            activity_type="COMPANY_UNARCHIVED",
            description=f"Company '{company.name}' was restored from archive by {unarchived_by}.",
            metadata={"is_archived": False},
            created_by=unarchived_by
        )
        return company

    @staticmethod
    def get_dashboard_stats(db: Session):
        total_companies = db.query(Company).filter(Company.is_archived.is_(False)).count()
        new_companies = db.query(Company).filter(
            Company.is_archived.is_(False),
            Company.status == CompanyStatus.NEW.value
        ).count()
        opportunities = db.query(Company).filter(
            Company.is_archived.is_(False),
            Company.opportunity_level.isnot(None),
            Company.opportunity_level != ""
        ).count()
        needs_review = db.query(Company).filter(
            Company.is_archived.is_(False),
            Company.status == CompanyStatus.NEEDS_REVIEW.value
        ).count()

        return {
            "total_companies": total_companies,
            "new_companies": new_companies,
            "opportunities": opportunities,
            "needs_review": needs_review
        }

    @staticmethod
    def get_recent_companies(db: Session, limit: int = 10) -> List[Company]:
        return db.query(Company).filter(
            Company.is_archived.is_(False)
        ).order_by(desc(Company.created_at)).limit(limit).all()
