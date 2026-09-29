import hashlib
import json
import re
from typing import Dict, List, Any, Optional, Set
from bs4 import BeautifulSoup, Comment
from urllib.parse import urljoin
from backend.app.services.url_normalizer import resolve_and_normalize_url, is_internal_url


class ExtractedPageData:
    def __init__(
        self,
        title: Optional[str] = None,
        meta_description: Optional[str] = None,
        canonical_url: Optional[str] = None,
        language: Optional[str] = None,
        h1: Optional[str] = None,
        h2_headings: Optional[List[str]] = None,
        extracted_text: str = "",
        word_count: int = 0,
        content_hash: str = "",
        internal_links: Optional[List[str]] = None,
        external_links: Optional[List[str]] = None,
        open_graph: Optional[Dict[str, str]] = None,
        twitter_card: Optional[Dict[str, str]] = None,
        json_ld: Optional[List[Dict[str, Any]]] = None,
    ):
        self.title = title
        self.meta_description = meta_description
        self.canonical_url = canonical_url
        self.language = language
        self.h1 = h1
        self.h2_headings = h2_headings or []
        self.extracted_text = extracted_text
        self.word_count = word_count
        self.content_hash = content_hash
        self.internal_links = internal_links or []
        self.external_links = external_links or []
        self.open_graph = open_graph or {}
        self.twitter_card = twitter_card or {}
        self.json_ld = json_ld or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "meta_description": self.meta_description,
            "canonical_url": self.canonical_url,
            "language": self.language,
            "h1": self.h1,
            "h2_headings": self.h2_headings,
            "word_count": self.word_count,
            "content_hash": self.content_hash,
            "internal_links_count": len(self.internal_links),
            "external_links_count": len(self.external_links),
            "open_graph": self.open_graph,
            "twitter_card": self.twitter_card,
            "json_ld_count": len(self.json_ld),
        }


def extract_page_data(
    html: str,
    base_url: str,
    max_text_bytes: int = 500 * 1024
) -> ExtractedPageData:
    """
    Extract structured metadata, headings, visible content, and links from raw HTML.
    Deterministic and safe.
    """
    if not html:
        return ExtractedPageData()

    soup = BeautifulSoup(html, "html.parser")

    # 1. Page Title
    title = None
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        title = title_tag.string.strip()
    if not title:
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            title = og_title["content"].strip()

    # 2. Meta Description
    meta_description = None
    meta_desc_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    if meta_desc_tag and meta_desc_tag.get("content"):
        meta_description = meta_desc_tag["content"].strip()
    elif not meta_description:
        og_desc = soup.find("meta", property="og:description")
        if og_desc and og_desc.get("content"):
            meta_description = og_desc["content"].strip()

    # 3. Canonical URL
    canonical_url = None
    canonical_tag = soup.find("link", rel=lambda r: r and "canonical" in r.lower())
    if canonical_tag and canonical_tag.get("href"):
        canonical_url = resolve_and_normalize_url(base_url, canonical_tag["href"].strip())

    # 4. Language
    language = None
    html_tag = soup.find("html")
    if html_tag and html_tag.get("lang"):
        language = html_tag["lang"].strip()[:50]
    elif html_tag and html_tag.get("xml:lang"):
        language = html_tag["xml:lang"].strip()[:50]
    else:
        meta_lang = soup.find("meta", attrs={"http-equiv": re.compile(r"^content-language$", re.I)})
        if meta_lang and meta_lang.get("content"):
            language = meta_lang["content"].strip()[:50]

    # 5. Headings (H1 and H2s)
    h1_text = None
    h1_tag = soup.find("h1")
    if h1_tag:
        h1_text = h1_tag.get_text(" ", strip=True)

    h2_headings: List[str] = []
    for h2_tag in soup.find_all("h2")[:20]:
        h2_val = h2_tag.get_text(" ", strip=True)
        if h2_val and h2_val not in h2_headings:
            h2_headings.append(h2_val)

    # 6. Open Graph & Twitter Cards
    open_graph: Dict[str, str] = {}
    twitter_card: Dict[str, str] = {}

    for meta in soup.find_all("meta"):
        prop = meta.get("property", "").lower()
        name = meta.get("name", "").lower()
        content = meta.get("content", "").strip()

        if not content:
            continue

        if prop.startswith("og:"):
            open_graph[prop] = content
        elif name.startswith("twitter:"):
            twitter_card[name] = content

    # 7. JSON-LD scripts
    json_ld_blocks: List[Dict[str, Any]] = []
    for script in soup.find_all("script", type=lambda t: t and "ld+json" in t.lower()):
        if script.string:
            try:
                data = json.loads(script.string.strip())
                if isinstance(data, dict):
                    json_ld_blocks.append(data)
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            json_ld_blocks.append(item)
            except Exception:
                pass

    # 8. Link Extraction (Internal vs External)
    internal_links: Set[str] = set()
    external_links: Set[str] = set()

    for a_tag in soup.find_all("a", href=True):
        raw_href = a_tag["href"].strip()
        normalized_link = resolve_and_normalize_url(base_url, raw_href)
        if not normalized_link:
            continue

        # Ignore static assets, images, PDFs from crawl queue
        parsed_link = normalized_link.lower()
        if re.search(r"\.(pdf|png|jpg|jpeg|gif|svg|webp|zip|tar|gz|mp3|mp4|avi|mov|exe|css|js)(\?.*)?$", parsed_link):
            continue

        if is_internal_url(base_url, normalized_link):
            internal_links.add(normalized_link)
        else:
            external_links.add(normalized_link)

    # 9. Clean Text Extraction
    # Make a copy of soup or remove unwanted tags: script, style, noscript, svg, path, iframe, form
    for unwanted in soup.find_all(["script", "style", "noscript", "svg", "iframe"]):
        unwanted.decompose()

    # Remove HTML comments
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    raw_text = soup.get_text(separator=" ", strip=True)
    # Collapse multiple whitespaces
    cleaned_text = re.sub(r"\s+", " ", raw_text).strip()

    # Enforce max text bytes limit
    if len(cleaned_text.encode("utf-8")) > max_text_bytes:
        cleaned_text = cleaned_text.encode("utf-8")[:max_text_bytes].decode("utf-8", "ignore")

    words = cleaned_text.split()
    word_count = len(words)

    # 10. Content Hash (sha256 of cleaned text)
    content_hash = hashlib.sha256(cleaned_text.encode("utf-8")).hexdigest()

    return ExtractedPageData(
        title=title,
        meta_description=meta_description,
        canonical_url=canonical_url,
        language=language,
        h1=h1_text,
        h2_headings=h2_headings,
        extracted_text=cleaned_text,
        word_count=word_count,
        content_hash=content_hash,
        internal_links=list(internal_links),
        external_links=list(external_links),
        open_graph=open_graph,
        twitter_card=twitter_card,
        json_ld=json_ld_blocks
    )
