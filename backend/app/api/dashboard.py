from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.schemas.dashboard import DashboardStats
from backend.app.schemas.company import CompanyOut
from backend.app.services.company_service import CompanyService
from backend.app.api.dependencies import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return CompanyService.get_dashboard_stats(db)


@router.get("/recent", response_model=List[CompanyOut])
def get_recent_companies(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return CompanyService.get_recent_companies(db, limit=limit)
