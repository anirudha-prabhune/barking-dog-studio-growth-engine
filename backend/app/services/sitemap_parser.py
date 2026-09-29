import xml.etree.ElementTree as ET
from urllib.parse import urlparse
from typing import List, Tuple
import logging

logger = logging.getLogger("barking_dog.sitemap")


def build_default_sitemap_url(target_url: str) -> str:
    """Build default /sitemap.xml URL."""
    parsed = urlparse(target_url)
    scheme = parsed.scheme or "https"
    netloc = parsed.netloc
    return f"{scheme}://{netloc}/sitemap.xml"


def parse_sitemap_xml(xml_content: str, max_urls: int = 100) -> Tuple[List[str], List[str]]:
    """
    Parse standard XML sitemaps and sitemap indexes safely.
    Returns (page_urls, nested_sitemap_urls).
    Uses defused/safe parsing with defused limits.
    """
    page_urls: List[str] = []
    nested_sitemaps: List[str] = []

    if not xml_content or not isinstance(xml_content, str):
        return page_urls, nested_sitemaps

    try:
        # Strip xml declaration if necessary or parse directly
        root = ET.fromstring(xml_content.encode("utf-8"))
    except Exception as exc:
        logger.debug(f"Failed to parse sitemap XML: {exc}")
        return page_urls, nested_sitemaps

    # Tag format in XML sitemaps typically contains namespace e.g. {http://www.sitemaps.org/schemas/sitemap/0.9}urlset
    # Match any namespace or no namespace
    for elem in root.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        if tag == "sitemap":
            # Nested sitemap in a sitemapindex
            for child in elem:
                child_tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                if child_tag == "loc" and child.text:
                    nested_sitemaps.append(child.text.strip())
        elif tag == "url":
            # Individual URL entry in urlset
            for child in elem:
                child_tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                if child_tag == "loc" and child.text:
                    url_str = child.text.strip()
                    if url_str and url_str not in page_urls:
                        page_urls.append(url_str)
                        if len(page_urls) >= max_urls:
                            return page_urls, nested_sitemaps

    return page_urls, nested_sitemaps
