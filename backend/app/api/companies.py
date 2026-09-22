from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.core.database import get_db
from backend.app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyOut,
    PaginatedCompanies
)
from backend.app.services.company_service import CompanyService
from backend.app.api.dependencies import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("", response_model=PaginatedCompanies)
def list_companies(
    search: Optional[str] = Query(None, description="Search company name, domain, industry, city"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    city: Optional[str] = Query(None, description="Filter by city"),
    status: Optional[str] = Query(None, description="Filter by status"),
    include_archived: bool = Query(False, description="Whether to include archived companies"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items, total, total_pages = CompanyService.list_companies(
        db=db,
        search=search,
        industry=industry,
        city=city,
        status=status,
        include_archived=include_archived,
        page=page,
        page_size=page_size
    )
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }


@router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = CompanyService.create(db=db, data=data, created_by=current_user.name)
    return company


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = CompanyService.get_by_id(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "COMPANY_NOT_FOUND", "message": f"Company with id {company_id} not found"}}
        )
    return company


@router.patch("/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: str,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = CompanyService.update(db=db, company_id=company_id, data=data, updated_by=current_user.name)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "COMPANY_NOT_FOUND", "message": f"Company with id {company_id} not found"}}
        )
    return company


@router.post("/{company_id}/archive", response_model=CompanyOut)
def archive_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = CompanyService.archive(db, company_id, archived_by=current_user.name)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "COMPANY_NOT_FOUND", "message": f"Company with id {company_id} not found"}}
        )
    return company


@router.post("/{company_id}/unarchive", response_model=CompanyOut)
def unarchive_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = CompanyService.unarchive(db, company_id, unarchived_by=current_user.name)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "COMPANY_NOT_FOUND", "message": f"Company with id {company_id} not found"}}
        )
    return company
