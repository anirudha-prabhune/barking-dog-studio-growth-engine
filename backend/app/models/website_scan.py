import enum
from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
from backend.app.models.base import generate_uuid, utc_now


class ScanStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class WebsiteScan(Base):
    __tablename__ = "website_scans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    target_url = Column(String(1024), nullable=False)
    status = Column(String(50), nullable=False, default=ScanStatus.PENDING.value, index=True)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    pages_discovered = Column(Integer, default=0, nullable=False)
    pages_fetched = Column(Integer, default=0, nullable=False)
    http_status = Column(Integer, nullable=True)
    final_url = Column(String(1024), nullable=True)
    error_message = Column(Text, nullable=True)
    robots_txt_status = Column(String(50), nullable=True)
    sitemap_found = Column(Boolean, default=False, nullable=False)
    agent_run_id = Column(String(36), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    company = relationship("Company", back_populates="website_scans")
    pages = relationship("WebsitePage", back_populates="scan", cascade="all, delete-orphan", order_by="asc(WebsitePage.depth)")
