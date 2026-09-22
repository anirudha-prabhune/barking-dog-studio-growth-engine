import enum
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
from backend.app.models.base import generate_uuid, utc_now


class CompanyStatus(str, enum.Enum):
    NEW = "NEW"
    RESEARCHING = "RESEARCHING"
    AUDITED = "AUDITED"
    QUALIFIED = "QUALIFIED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    NURTURE = "NURTURE"


class OpportunityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Company(Base):
    __tablename__ = "companies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    domain = Column(String(255), index=True, nullable=True)
    website_url = Column(String(1024), nullable=False)
    industry = Column(String(255), index=True, nullable=True)
    sub_industry = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    city = Column(String(100), index=True, nullable=True)
    employee_range = Column(String(100), nullable=True)
    revenue_range = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    linkedin_url = Column(String(1024), nullable=True)
    
    status = Column(
        String(50),
        default=CompanyStatus.NEW.value,
        nullable=False,
        index=True
    )
    opportunity_level = Column(String(50), nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    activities = relationship("Activity", back_populates="company", cascade="all, delete-orphan", order_by="desc(Activity.created_at)")
    evidence_items = relationship("Evidence", back_populates="company", cascade="all, delete-orphan")
