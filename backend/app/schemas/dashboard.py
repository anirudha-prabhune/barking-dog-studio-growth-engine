from pydantic import BaseModel
from typing import List
from backend.app.schemas.company import CompanyOut


class DashboardStats(BaseModel):
    total_companies: int
    new_companies: int
    opportunities: int
    needs_review: int


class DashboardData(BaseModel):
    stats: DashboardStats
    recent_companies: List[CompanyOut]
