import re
from urllib.parse import urlparse, urlunparse, urljoin, quote, unquote


def normalize_website_url(url: str, default_scheme: str = "https") -> str:
    """
    Deterministically normalize a target website URL:
    - Prepends default scheme if missing
    - Lowercases scheme and netloc/host
    - Strips fragment identifiers (#...)
    - Removes standard default ports (:80 for http, :443 for https)
    - Strips trailing slash on root paths (e.g. https://example.com/ -> https://example.com)
    - Normalizes duplicate slashes in path (e.g. //path -> /path) while preserving query string
    - Preserves meaningful paths and query parameters
    """
    if not url or not isinstance(url, str):
        return ""

    url_str = url.strip()

    # Prepend scheme if missing (e.g. example.com or //example.com)
    if url_str.startswith("//"):
        url_str = f"{default_scheme}:{url_str}"
    elif not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url_str):
        url_str = f"{default_scheme}://{url_str}"

    try:
        parsed = urlparse(url_str)
    except Exception:
        return url_str

    scheme = (parsed.scheme or default_scheme).lower()
    netloc = (parsed.netloc or "").lower()

    # Strip default ports
    if ":" in netloc:
        parts = netloc.rsplit(":", 1)
        host, port_str = parts[0], parts[1]
        if (scheme == "http" and port_str == "80") or (scheme == "https" and port_str == "443"):
            netloc = host

    path = parsed.path or ""
    # Remove duplicate consecutive slashes in path
    if path:
        path = re.sub(r"/{2,}", "/", path)
        # Normalize root path trailing slash: "https://example.com/" -> "https://example.com"
        if path == "/":
            path = ""
        elif path.endswith("/") and len(path) > 1:
            # Preserve path without trailing slash for consistent internal link deduplication
            # unless it's a file extension or explicitly needed
            path = path.rstrip("/")

    # Discard fragment, preserve query
    normalized = urlunparse((
        scheme,
        netloc,
        path,
        parsed.params,
        parsed.query,
        ""  # Strip fragment
    ))

    return normalized


def resolve_and_normalize_url(base_url: str, relative_or_absolute_link: str) -> str:
    """
    Resolve a potentially relative link against a base URL and normalize the result.
    """
    if not relative_or_absolute_link:
        return ""
    
    link = relative_or_absolute_link.strip()
    
    # Ignore javascript:, mailto:, tel:, data: links
    lowered = link.lower()
    if lowered.startswith(("javascript:", "mailto:", "tel:", "sms:", "data:", "#")):
        return ""

    joined = urljoin(base_url, link)
    return normalize_website_url(joined)


def is_internal_url(base_url: str, candidate_url: str) -> bool:
    """
    Determine if candidate_url belongs to the same domain / apex domain as base_url.
    Matches exact hostname or subdomain of base_url (e.g. blog.example.com and example.com).
    """
    try:
        base_host = (urlparse(base_url).hostname or "").lower()
        cand_host = (urlparse(candidate_url).hostname or "").lower()

        if not base_host or not cand_host:
            return False

        if base_host == cand_host:
            return True

        # Strip 'www.' if present
        clean_base = base_host[4:] if base_host.startswith("www.") else base_host
        clean_cand = cand_host[4:] if cand_host.startswith("www.") else cand_host

        if clean_base == clean_cand:
            return True

        # Check if candidate is a subdomain of the base host
        if clean_cand.endswith(f".{clean_base}"):
            return True

        return False
    except Exception:
        return False
