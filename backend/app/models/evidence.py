from sqlalchemy import Column, String, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
from backend.app.models.base import generate_uuid, utc_now


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(100), nullable=False)
    statement = Column(Text, nullable=False)
    source_name = Column(String(255), nullable=False)
    source_url = Column(String(1024), nullable=True)
    confidence = Column(Float, nullable=True)
    captured_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    company = relationship("Company", back_populates="evidence_items")
