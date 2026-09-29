from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
from backend.app.models.base import generate_uuid, utc_now


class WebsitePage(Base):
    __tablename__ = "website_pages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(String(36), ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(1024), nullable=False, index=True)
    final_url = Column(String(1024), nullable=True)
    canonical_url = Column(String(1024), nullable=True)
    status_code = Column(Integer, nullable=True)
    content_type = Column(String(255), nullable=True)
    title = Column(String(1024), nullable=True)
    meta_description = Column(Text, nullable=True)
    language = Column(String(50), nullable=True)
    h1 = Column(Text, nullable=True)
    h2_text = Column(Text, nullable=True)
    word_count = Column(Integer, default=0, nullable=False)
    content_hash = Column(String(64), nullable=True, index=True)
    depth = Column(Integer, default=0, nullable=False)
    is_internal = Column(Boolean, default=True, nullable=False)
    is_homepage = Column(Boolean, default=False, nullable=False)
    is_canonical = Column(Boolean, default=True, nullable=False)
    discovered_from = Column(String(1024), nullable=True)
    html_snapshot = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=True)
    meta_json = Column(Text, nullable=True)  # OpenGraph, Twitter, JSON-LD, tech detection data
    fetched_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    scan = relationship("WebsiteScan", back_populates="pages")
