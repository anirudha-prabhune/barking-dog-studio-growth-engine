import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from backend.app.models.activity import Activity
from backend.app.models.base import utc_now


class ActivityService:
    @staticmethod
    def record_activity(
        db: Session,
        company_id: str,
        activity_type: str,
        description: str,
        metadata: Optional[Any] = None,
        created_by: str = "System"
    ) -> Activity:
        metadata_str = None
        if metadata is not None:
            if isinstance(metadata, str):
                metadata_str = metadata
            else:
                metadata_str = json.dumps(metadata, default=str)

        activity = Activity(
            company_id=company_id,
            activity_type=activity_type,
            description=description,
            metadata_json=metadata_str,
            created_by=created_by,
            created_at=utc_now()
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity

    @staticmethod
    def get_company_activities(db: Session, company_id: str, limit: int = 50):
        return db.query(Activity).filter(Activity.company_id == company_id).order_by(Activity.created_at.desc()).limit(limit).all()
