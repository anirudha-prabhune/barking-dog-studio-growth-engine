import json
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.app.core.database import get_db, SessionLocal
from backend.app.models.user import User
from backend.app.models.company import Company
from backend.app.models.website_scan import WebsiteScan, ScanStatus
from backend.app.models.website_page import WebsitePage
from backend.app.models.evidence import Evidence
from backend.app.api.dependencies import get_current_user
from backend.app.schemas.website_scan import (
    WebsiteScanTrigger,
    WebsiteScanOut,
    WebsitePageOut,
    WebsitePageDetailOut,
    PaginatedWebsiteScans,
    PaginatedWebsitePages,
    DetectedTechnologyOut
)
from backend.app.services.url_normalizer import normalize_website_url
from backend.app.services.url_safety import validate_url_safety, SSRFValidationError
from backend.app.services.website_crawler import WebsiteCrawler

logger = logging.getLogger("barking_dog.api.scans")
router = APIRouter(tags=["Website Intelligence"])


async def run_crawler_task(scan_id: str):
    """Background task runner for executing website crawl asynchronously."""
    db = SessionLocal()
    try:
        crawler = WebsiteCrawler(db=db, scan_id=scan_id)
        await crawler.execute_scan()
    except Exception as exc:
        logger.error(f"Background crawl task failed for scan {scan_id}: {exc}", exc_info=True)
    finally:
        db.close()


def _format_scan_out(scan: WebsiteScan, db: Session) -> WebsiteScanOut:
    """Helper to populate detected technologies from pages and evidence."""
    technologies: List[DetectedTechnologyOut] = []
    seen_tech = set()

    # Query pages for detected technologies stored in meta_json
    pages = db.query(WebsitePage).filter(WebsitePage.scan_id == scan.id).all()
    for page in pages:
        if page.meta_json:
            try:
                meta = json.loads(page.meta_json)
                for t in meta.get("technologies", []):
                    tech_name = t.get("technology")
                    if tech_name and tech_name not in seen_tech:
                        seen_tech.add(tech_name)
                        technologies.append(DetectedTechnologyOut(
                            technology=tech_name,
                            confidence=t.get("confidence", 1.0),
                            evidence=t.get("evidence", ""),
                            source_url=t.get("source_url") or page.final_url or page.url
                        ))
            except Exception:
                pass

    return WebsiteScanOut(
        id=scan.id,
        company_id=scan.company_id,
        target_url=scan.target_url,
        status=scan.status,
        started_at=scan.started_at,
        completed_at=scan.completed_at,
        duration_ms=scan.duration_ms,
        pages_discovered=scan.pages_discovered,
        pages_fetched=scan.pages_fetched,
        http_status=scan.http_status,
        final_url=scan.final_url,
        error_message=scan.error_message,
        robots_txt_status=scan.robots_txt_status,
        sitemap_found=scan.sitemap_found,
        agent_run_id=scan.agent_run_id,
        created_at=scan.created_at,
        technologies=technologies
    )


@router.post("/companies/{company_id}/scans", response_model=WebsiteScanOut, status_code=status.HTTP_202_ACCEPTED)
def trigger_company_website_scan(
    company_id: str,
    payload: Optional[WebsiteScanTrigger] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger a deterministic Website Intelligence scan for a company.
    - Validates company presence
    - Validates URL structure and SSRF safety
    - Prevents concurrent duplicate RUNNING scans for the same company
    - Launches background crawler execution
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "COMPANY_NOT_FOUND", "message": f"Company with id {company_id} not found."}}
        )

    # Determine target URL
    raw_url = (payload.url if payload and payload.url else company.website_url) or ""
    if not raw_url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_URL", "message": "Company does not have a configured website URL."}}
        )

    target_url = normalize_website_url(raw_url)

    # SSRF safety validation
    try:
        validate_url_safety(target_url)
    except SSRFValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "SSRF_VIOLATION", "message": str(exc)}}
        )

    # Check for already running scan for this company
    active_scan = db.query(WebsiteScan).filter(
        WebsiteScan.company_id == company_id,
        WebsiteScan.status.in_([ScanStatus.PENDING.value, ScanStatus.RUNNING.value])
    ).first()

    if active_scan:
        return _format_scan_out(active_scan, db)

    # Create new scan record
    new_scan = WebsiteScan(
        company_id=company.id,
        target_url=target_url,
        status=ScanStatus.PENDING.value,
        started_at=datetime.now(timezone.utc)
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    # Enqueue background crawl task
    background_tasks.add_task(run_crawler_task, scan_id=new_scan.id)

    return _format_scan_out(new_scan, db)


@router.get("/companies/{company_id}/scans", response_model=PaginatedWebsiteScans)
def list_company_scans(
    company_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List historical website intelligence scans for a specific company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "COMPANY_NOT_FOUND", "message": f"Company with id {company_id} not found."}}
        )

    query = db.query(WebsiteScan).filter(WebsiteScan.company_id == company_id).order_by(WebsiteScan.created_at.desc())
    total = query.count()
    scans = query.offset((page - 1) * page_size).limit(page_size).all()

    items = [_format_scan_out(s, db) for s in scans]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedWebsiteScans(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/scans/{scan_id}", response_model=WebsiteScanOut)
def get_scan_details(
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full details of a specific website intelligence scan."""
    scan = db.query(WebsiteScan).filter(WebsiteScan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SCAN_NOT_FOUND", "message": f"Scan with id {scan_id} not found."}}
        )

    return _format_scan_out(scan, db)


@router.get("/scans/{scan_id}/pages", response_model=PaginatedWebsitePages)
def list_scan_pages(
    scan_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve paginated list of pages fetched during a specific scan."""
    scan = db.query(WebsiteScan).filter(WebsiteScan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SCAN_NOT_FOUND", "message": f"Scan with id {scan_id} not found."}}
        )

    query = db.query(WebsitePage).filter(WebsitePage.scan_id == scan_id).order_by(WebsitePage.depth.asc(), WebsitePage.fetched_at.asc())
    total = query.count()
    pages = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedWebsitePages(
        items=[WebsitePageOut.model_validate(p) for p in pages],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/scans/{scan_id}/pages/{page_id}", response_model=WebsitePageDetailOut)
def get_scan_page_detail(
    scan_id: str,
    page_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve complete audit details for a specific crawled web page."""
    page = db.query(WebsitePage).filter(
        WebsitePage.scan_id == scan_id,
        WebsitePage.id == page_id
    ).first()

    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "PAGE_NOT_FOUND", "message": f"Page with id {page_id} not found for scan {scan_id}."}}
        )

    return WebsitePageDetailOut.model_validate(page)


@router.post("/scans/{scan_id}/cancel", response_model=WebsiteScanOut)
def cancel_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an active or pending scan."""
    scan = db.query(WebsiteScan).filter(WebsiteScan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SCAN_NOT_FOUND", "message": f"Scan with id {scan_id} not found."}}
        )

    if scan.status in [ScanStatus.PENDING.value, ScanStatus.RUNNING.value]:
        scan.status = ScanStatus.CANCELLED.value
        scan.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(scan)

    return _format_scan_out(scan, db)
