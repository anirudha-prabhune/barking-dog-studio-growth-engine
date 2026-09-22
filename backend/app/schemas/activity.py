from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Any


class ActivityBase(BaseModel):
    company_id: str
    activity_type: str
    description: str
    metadata_json: Optional[str] = None
    created_by: str = "System"


class ActivityCreate(ActivityBase):
    pass


class ActivityOut(ActivityBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
