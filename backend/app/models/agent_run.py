from sqlalchemy import Column, String, DateTime, Text, Integer
from backend.app.core.database import Base
from backend.app.models.base import generate_uuid, utc_now


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    agent_name = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)  # PENDING, RUNNING, COMPLETED, FAILED
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    model = Column(String(100), nullable=True)
    prompt_version = Column(String(50), nullable=True)
    input_json = Column(Text, nullable=True)
    output_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
