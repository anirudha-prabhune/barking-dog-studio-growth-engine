from datetime import datetime
from pydantic import BaseModel, HttpUrl, field_validator
from typing import Optional, List
from backend.app.models.company import CompanyStatus, OpportunityLevel
from backend.app.schemas.activity import ActivityOut
import re


def validate_url_str(v: Optional[str]) -> Optional[str]:
    if v is None or v == "":
        return None
    v = v.strip()
    if not (v.startswith("http://") or v.startswith("https://")):
        v = "https://" + v
    # Simple regex URL sanity check
    url_pattern = re.compile(
        r"^(https?://)?"
        r"([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}"
        r"(/.*)?$",
        re.IGNORECASE
    )
    if not url_pattern.match(v):
        raise ValueError("Invalid URL format. Must be a valid web address, e.g. https://example.com")
    return v


def validate_linkedin_str(v: Optional[str]) -> Optional[str]:
    if v is None or v == "":
        return None
    v = v.strip()
    if not (v.startswith("http://") or v.startswith("https://")):
        v = "https://" + v
    if "linkedin.com" not in v.lower():
        raise ValueError("Invalid LinkedIn URL format. Must point to linkedin.com")
    return v


class CompanyBase(BaseModel):
    name: str
    website_url: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    sub_industry: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    employee_range: Optional[str] = None
    revenue_range: Optional[str] = None
    description: Optional[str] = None
    linkedin_url: Optional[str] = None
    status: Optional[str] = CompanyStatus.NEW.value
    opportunity_level: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Company name is required and cannot be empty")
        return v.strip()

    @field_validator("website_url")
    @classmethod
    def check_website_url(cls, v: str) -> str:
        res = validate_url_str(v)
        if not res:
            raise ValueError("Website URL is required")
        return res

    @field_validator("linkedin_url")
    @classmethod
    def check_linkedin_url(cls, v: Optional[str]) -> Optional[str]:
        return validate_linkedin_str(v)


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website_url: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    sub_industry: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    employee_range: Optional[str] = None
    revenue_range: Optional[str] = None
    description: Optional[str] = None
    linkedin_url: Optional[str] = None
    status: Optional[str] = None
    opportunity_level: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name_if_present(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Company name cannot be blank")
        return v.strip() if v else None

    @field_validator("website_url")
    @classmethod
    def check_website_url_if_present(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_url_str(v)
        return None

    @field_validator("linkedin_url")
    @classmethod
    def check_linkedin_if_present(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_linkedin_str(v)
        return None


class CompanyOut(CompanyBase):
    id: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    activities: Optional[List[ActivityOut]] = []

    class Config:
        from_attributes = True


class PaginatedCompanies(BaseModel):
    items: List[CompanyOut]
    page: int
    page_size: int
    total: int
    total_pages: int
