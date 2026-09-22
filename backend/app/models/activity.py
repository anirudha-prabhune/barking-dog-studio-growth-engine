from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
from backend.app.models.base import generate_uuid, utc_now


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON-encoded payload
    created_by = Column(String(255), default="System", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    company = relationship("Company", back_populates="activities")
