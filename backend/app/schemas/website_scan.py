from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class WebsiteScanTrigger(BaseModel):
    url: Optional[str] = Field(None, description="Optional custom target URL. If omitted, uses company's website_url.")


class DetectedTechnologyOut(BaseModel):
    technology: str
    confidence: float
    evidence: str
    source_url: str


class WebsitePageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    scan_id: str
    url: str
    final_url: Optional[str] = None
    canonical_url: Optional[str] = None
    status_code: Optional[int] = None
    content_type: Optional[str] = None
    title: Optional[str] = None
    meta_description: Optional[str] = None
    language: Optional[str] = None
    word_count: int = 0
    depth: int = 0
    is_internal: bool = True
    is_homepage: bool = False
    is_canonical: bool = True
    discovered_from: Optional[str] = None
    fetched_at: datetime
    created_at: datetime


class WebsitePageDetailOut(WebsitePageOut):
    model_config = ConfigDict(from_attributes=True)

    h1: Optional[str] = None
    h2_text: Optional[str] = None
    content_hash: Optional[str] = None
    extracted_text: Optional[str] = None
    html_snapshot: Optional[str] = None
    meta_json: Optional[str] = None


class WebsiteScanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    target_url: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    pages_discovered: int = 0
    pages_fetched: int = 0
    http_status: Optional[int] = None
    final_url: Optional[str] = None
    error_message: Optional[str] = None
    robots_txt_status: Optional[str] = None
    sitemap_found: bool = False
    agent_run_id: Optional[str] = None
    created_at: datetime
    technologies: List[DetectedTechnologyOut] = []


class PaginatedWebsiteScans(BaseModel):
    items: List[WebsiteScanOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedWebsitePages(BaseModel):
    items: List[WebsitePageOut]
    total: int
    page: int
    page_size: int
    total_pages: int
