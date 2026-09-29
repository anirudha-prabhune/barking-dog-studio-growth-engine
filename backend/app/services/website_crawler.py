import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.agent_run import AgentRun
from backend.app.models.company import Company
from backend.app.models.evidence import Evidence
from backend.app.models.website_page import WebsitePage
from backend.app.models.website_scan import WebsiteScan, ScanStatus
from backend.app.services.robots_parser import RobotsPolicy, build_robots_url
from backend.app.services.sitemap_parser import build_default_sitemap_url, parse_sitemap_xml
from backend.app.services.tech_detector import detect_technologies
from backend.app.services.url_normalizer import (
    is_internal_url,
    normalize_website_url,
    resolve_and_normalize_url,
)
from backend.app.services.url_safety import SSRFValidationError, validate_url_safety
from backend.app.services.website_extractor import extract_page_data

logger = logging.getLogger("barking_dog.crawler")


class SafeHttpResponse:
    def __init__(
        self,
        status_code: int,
        final_url: str,
        content_type: str,
        headers: Dict[str, str],
        html_text: str,
        byte_size: int,
    ):
        self.status_code = status_code
        self.final_url = final_url
        self.content_type = content_type
        self.headers = headers
        self.html_text = html_text
        self.byte_size = byte_size


async def safe_fetch(
    url: str,
    client: httpx.AsyncClient,
    max_redirects: int = 5,
    max_bytes: int = 5 * 1024 * 1024,
) -> SafeHttpResponse:
    """
    Fetch a URL with strict SSRF validation across all redirect hops,
    content-type enforcement, and byte limits.
    """
    current_url = url
    redirect_count = 0

    while True:
        # SSRF validation before EVERY hop
        validate_url_safety(current_url)

        headers = {
            "User-Agent": settings.CRAWLER_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        response = await client.get(
            current_url,
            headers=headers,
            follow_redirects=False,
            timeout=settings.CRAWLER_REQUEST_TIMEOUT_SECONDS,
        )

        # Handle Redirects manually to enforce SSRF validation at every hop
        if response.is_redirect:
            redirect_count += 1
            if redirect_count > max_redirects:
                raise SSRFValidationError(f"Exceeded maximum redirects ({max_redirects}) for URL {url}")

            location = response.headers.get("Location")
            if not location:
                raise SSRFValidationError("Redirect response missing Location header.")

            next_url = resolve_and_normalize_url(current_url, location)
            if not next_url:
                raise SSRFValidationError(f"Invalid redirect target: '{location}'")

            current_url = next_url
            continue

        # Non-redirect response: inspect content-type
        content_type = response.headers.get("content-type", "").lower()
        
        # Verify content type is web markup or plain text (for robots/sitemap)
        # Note: robots.txt and sitemap.xml might be text/plain or text/xml
        is_html = "text/html" in content_type or "application/xhtml+xml" in content_type
        is_xml_or_txt = "xml" in content_type or "text/plain" in content_type

        # Check content length if available
        cl_header = response.headers.get("content-length")
        if cl_header:
            try:
                if int(cl_header) > max_bytes:
                    raise ValueError(f"Content-Length ({cl_header} bytes) exceeds limit ({max_bytes} bytes)")
            except (ValueError, TypeError):
                pass

        raw_bytes = response.content
        if len(raw_bytes) > max_bytes:
            raw_bytes = raw_bytes[:max_bytes]

        encoding = response.encoding or "utf-8"
        try:
            body_text = raw_bytes.decode(encoding, errors="replace")
        except Exception:
            body_text = raw_bytes.decode("utf-8", errors="replace")

        resp_headers = {k: v for k, v in response.headers.items()}

        return SafeHttpResponse(
            status_code=response.status_code,
            final_url=str(response.url),
            content_type=content_type,
            headers=resp_headers,
            html_text=body_text,
            byte_size=len(raw_bytes),
        )


class WebsiteCrawler:
    def __init__(self, db: Session, scan_id: str):
        self.db = db
        self.scan_id = scan_id

    async def execute_scan(self) -> WebsiteScan:
        """
        Coordinates full deterministic crawl workflow:
        1. Load and initialize WebsiteScan & AgentRun
        2. Validate target URL SSRF safety
        3. Fetch robots.txt & discover sitemaps
        4. Fetch homepage & detect technologies
        5. Discover internal links & parse sitemaps
        6. Crawl bounded internal pages (depth <= MAX_DEPTH, count <= MAX_PAGES)
        7. Extract structured metadata & store WebsitePages
        8. Generate auditable Evidence records
        9. Complete AgentRun & update WebsiteScan status
        """
        scan = self.db.query(WebsiteScan).filter(WebsiteScan.id == self.scan_id).first()
        if not scan:
            raise ValueError(f"Scan with ID {self.scan_id} not found.")

        company = self.db.query(Company).filter(Company.id == scan.company_id).first()
        if not company:
            raise ValueError(f"Company for scan {self.scan_id} not found.")

        # Create or update AgentRun
        agent_run = AgentRun(
            agent_name="website_intelligence",
            entity_type="company",
            entity_id=company.id,
            status="RUNNING",
            started_at=datetime.now(timezone.utc),
            model="deterministic_crawler",
            prompt_version="2.0",
            input_json=json.dumps({
                "target_url": scan.target_url,
                "company_id": company.id,
                "company_name": company.name,
                "max_pages": settings.CRAWLER_MAX_PAGES_PER_SCAN,
                "max_depth": settings.CRAWLER_MAX_CRAWL_DEPTH,
            }),
        )
        self.db.add(agent_run)
        self.db.flush()

        scan.agent_run_id = agent_run.id
        scan.status = ScanStatus.RUNNING.value
        scan.started_at = datetime.now(timezone.utc)
        self.db.commit()

        start_time = time.time()
        discovered_urls: Set[str] = set()
        crawled_urls: Set[str] = set()
        all_detected_techs: List[Dict] = []
        pages_to_crawl: List[Tuple[str, int, Optional[str]]] = []  # (url, depth, discovered_from)

        target_url = normalize_website_url(scan.target_url)
        discovered_urls.add(target_url)
        pages_to_crawl.append((target_url, 0, None))

        try:
            # 1. Pre-validation of target URL SSRF safety
            validate_url_safety(target_url)

            async with httpx.AsyncClient(verify=True) as client:
                # 2. Fetch robots.txt
                robots_url = build_robots_url(target_url)
                robots_policy = RobotsPolicy(None, target_url)
                try:
                    robots_resp = await safe_fetch(robots_url, client, max_bytes=256 * 1024)
                    if robots_resp.status_code == 200:
                        robots_policy = RobotsPolicy(robots_resp.html_text, target_url)
                        scan.robots_txt_status = "FOUND"
                    else:
                        scan.robots_txt_status = f"HTTP_{robots_resp.status_code}"
                except Exception as exc:
                    logger.info(f"robots.txt not accessible for {target_url}: {exc}")
                    scan.robots_txt_status = "UNAVAILABLE"

                # 3. Discover Sitemaps
                sitemap_candidate_urls = list(robots_policy.sitemaps)
                if not sitemap_candidate_urls:
                    sitemap_candidate_urls.append(build_default_sitemap_url(target_url))

                sitemaps_inspected = 0
                for sm_url in sitemap_candidate_urls[:settings.CRAWLER_MAX_SITEMAPS]:
                    try:
                        sm_resp = await safe_fetch(sm_url, client, max_bytes=1024 * 1024)
                        if sm_resp.status_code == 200 and sm_resp.html_text:
                            scan.sitemap_found = True
                            page_urls, nested = parse_sitemap_xml(
                                sm_resp.html_text,
                                max_urls=settings.CRAWLER_MAX_SITEMAP_URLS
                            )
                            for pu in page_urls:
                                norm_pu = normalize_website_url(pu)
                                if is_internal_url(target_url, norm_pu) and norm_pu not in discovered_urls:
                                    discovered_urls.add(norm_pu)
                                    # Add to crawl queue at depth 1
                                    if len(pages_to_crawl) < settings.CRAWLER_MAX_PAGES_PER_SCAN:
                                        pages_to_crawl.append((norm_pu, 1, sm_url))
                            sitemaps_inspected += 1
                    except Exception as exc:
                        logger.debug(f"Sitemap check at {sm_url} failed: {exc}")

                # 4. Bounded Crawling Loop
                fetched_pages_count = 0
                homepage_extracted_data: Optional[ExtractedPageData] = None

                while pages_to_crawl and fetched_pages_count < settings.CRAWLER_MAX_PAGES_PER_SCAN:
                    curr_url, curr_depth, discovered_from = pages_to_crawl.pop(0)

                    if curr_url in crawled_urls:
                        continue

                    # Check robots.txt permission
                    if not robots_policy.is_allowed(curr_url):
                        logger.info(f"URL disallowed by robots.txt: {curr_url}")
                        continue

                    # Fetch page
                    try:
                        fetch_resp = await safe_fetch(
                            curr_url,
                            client,
                            max_redirects=settings.CRAWLER_MAX_REDIRECTS,
                            max_bytes=settings.CRAWLER_MAX_RESPONSE_BYTES
                        )
                    except Exception as exc:
                        logger.warning(f"Failed to fetch {curr_url}: {exc}")
                        # Record error page record for auditability
                        error_page = WebsitePage(
                            scan_id=scan.id,
                            url=curr_url,
                            final_url=None,
                            status_code=None,
                            content_type=None,
                            depth=curr_depth,
                            is_internal=is_internal_url(target_url, curr_url),
                            is_homepage=(curr_depth == 0),
                            discovered_from=discovered_from,
                            extracted_text=f"Fetch failed: {str(exc)}"[:1000],
                            fetched_at=datetime.now(timezone.utc),
                        )
                        self.db.add(error_page)
                        crawled_urls.add(curr_url)
                        continue

                    crawled_urls.add(curr_url)
                    fetched_pages_count += 1

                    # If homepage (depth 0), record scan-level final_url and http_status
                    if curr_depth == 0:
                        scan.final_url = fetch_resp.final_url
                        scan.http_status = fetch_resp.status_code

                    # Parse HTML and extract structured metadata
                    soup = BeautifulSoup(fetch_resp.html_text, "html.parser")
                    extracted = extract_page_data(
                        fetch_resp.html_text,
                        fetch_resp.final_url,
                        max_text_bytes=settings.CRAWLER_MAX_TEXT_STORAGE_BYTES
                    )

                    if curr_depth == 0:
                        homepage_extracted_data = extracted

                    # Detect technologies
                    tech_signals = detect_technologies(
                        fetch_resp.final_url,
                        fetch_resp.html_text,
                        fetch_resp.headers,
                        soup=soup
                    )
                    for tech in tech_signals:
                        if not any(t["technology"] == tech["technology"] for t in all_detected_techs):
                            all_detected_techs.append(tech)

                    # Truncate HTML snapshot to max allowed storage bytes
                    snapshot_text = fetch_resp.html_text
                    if len(snapshot_text.encode("utf-8")) > settings.CRAWLER_MAX_HTML_STORAGE_BYTES:
                        snapshot_text = snapshot_text.encode("utf-8")[:settings.CRAWLER_MAX_HTML_STORAGE_BYTES].decode("utf-8", "ignore")

                    # Metadata JSON for storage
                    page_meta_json = json.dumps({
                        "open_graph": extracted.open_graph,
                        "twitter_card": extracted.twitter_card,
                        "json_ld": extracted.json_ld,
                        "technologies": tech_signals,
                        "external_links_sample": extracted.external_links[:15]
                    })

                    page_record = WebsitePage(
                        scan_id=scan.id,
                        url=curr_url,
                        final_url=fetch_resp.final_url,
                        canonical_url=extracted.canonical_url,
                        status_code=fetch_resp.status_code,
                        content_type=fetch_resp.content_type,
                        title=extracted.title,
                        meta_description=extracted.meta_description,
                        language=extracted.language,
                        h1=extracted.h1,
                        h2_text="\n".join(extracted.h2_headings) if extracted.h2_headings else None,
                        word_count=extracted.word_count,
                        content_hash=extracted.content_hash,
                        depth=curr_depth,
                        is_internal=is_internal_url(target_url, fetch_resp.final_url),
                        is_homepage=(curr_depth == 0),
                        is_canonical=(extracted.canonical_url == fetch_resp.final_url or not extracted.canonical_url),
                        discovered_from=discovered_from,
                        html_snapshot=snapshot_text,
                        extracted_text=extracted.extracted_text,
                        meta_json=page_meta_json,
                        fetched_at=datetime.now(timezone.utc)
                    )
                    self.db.add(page_record)

                    # Discover next level internal links if within MAX_CRAWL_DEPTH
                    if curr_depth < settings.CRAWLER_MAX_CRAWL_DEPTH:
                        for internal_link in extracted.internal_links:
                            if internal_link not in discovered_urls:
                                discovered_urls.add(internal_link)
                                if len(pages_to_crawl) + fetched_pages_count < settings.CRAWLER_MAX_PAGES_PER_SCAN * 2:
                                    pages_to_crawl.append((internal_link, curr_depth + 1, fetch_resp.final_url))

            # 5. Populate Evidence records for Company
            if homepage_extracted_data and homepage_extracted_data.title:
                self._add_evidence(
                    company_id=company.id,
                    evidence_type="WEBSITE_TITLE",
                    statement=f"Homepage title: {homepage_extracted_data.title}",
                    source_url=scan.final_url or scan.target_url,
                    confidence=1.0
                )

            if homepage_extracted_data and homepage_extracted_data.meta_description:
                self._add_evidence(
                    company_id=company.id,
                    evidence_type="META_DESCRIPTION",
                    statement=f"Meta description: {homepage_extracted_data.meta_description}",
                    source_url=scan.final_url or scan.target_url,
                    confidence=1.0
                )

            for tech in all_detected_techs:
                self._add_evidence(
                    company_id=company.id,
                    evidence_type="TECHNOLOGY_SIGNAL",
                    statement=f"{tech['technology']} detected on digital storefront. {tech['evidence']}",
                    source_url=tech.get("source_url") or scan.final_url or scan.target_url,
                    confidence=tech.get("confidence", 1.0)
                )

            if fetched_pages_count > 0:
                self._add_evidence(
                    company_id=company.id,
                    evidence_type="WEBSITE_STRUCTURE",
                    statement=f"Website crawl discovered {len(discovered_urls)} internal pages; verified {fetched_pages_count} pages up to depth {settings.CRAWLER_MAX_CRAWL_DEPTH}.",
                    source_url=scan.final_url or scan.target_url,
                    confidence=1.0
                )

            # 6. Mark Scan and AgentRun as COMPLETED
            duration_ms = int((time.time() - start_time) * 1000)
            scan.status = ScanStatus.COMPLETED.value
            scan.completed_at = datetime.now(timezone.utc)
            scan.duration_ms = duration_ms
            scan.pages_discovered = len(discovered_urls)
            scan.pages_fetched = fetched_pages_count

            agent_run.status = "COMPLETED"
            agent_run.completed_at = datetime.now(timezone.utc)
            agent_run.duration_ms = duration_ms
            agent_run.output_json = json.dumps({
                "scan_id": scan.id,
                "status": "COMPLETED",
                "final_url": scan.final_url,
                "http_status": scan.http_status,
                "pages_discovered": len(discovered_urls),
                "pages_fetched": fetched_pages_count,
                "technologies_detected": [t["technology"] for t in all_detected_techs],
                "robots_txt": scan.robots_txt_status,
                "sitemap_found": scan.sitemap_found,
            })

            self.db.commit()
            return scan

        except Exception as exc:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Website scan failed for {scan.target_url}: {exc}", exc_info=True)

            scan.status = ScanStatus.FAILED.value
            scan.completed_at = datetime.now(timezone.utc)
            scan.duration_ms = duration_ms
            scan.error_message = str(exc)

            agent_run.status = "FAILED"
            agent_run.completed_at = datetime.now(timezone.utc)
            agent_run.duration_ms = duration_ms
            agent_run.error_message = str(exc)

            self.db.commit()
            return scan

    def _add_evidence(
        self,
        company_id: str,
        evidence_type: str,
        statement: str,
        source_url: str,
        confidence: float = 1.0
    ):
        """Idempotently add an evidence item for the company if not already existing."""
        existing = self.db.query(Evidence).filter(
            Evidence.company_id == company_id,
            Evidence.type == evidence_type,
            Evidence.statement == statement
        ).first()

        if not existing:
            ev = Evidence(
                company_id=company_id,
                type=evidence_type,
                statement=statement,
                source_name="Website Intelligence",
                source_url=source_url,
                confidence=confidence,
                captured_at=datetime.now(timezone.utc)
            )
            self.db.add(ev)
