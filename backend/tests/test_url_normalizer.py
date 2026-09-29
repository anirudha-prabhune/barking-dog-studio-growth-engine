from backend.app.services.url_normalizer import (
    normalize_website_url,
    resolve_and_normalize_url,
    is_internal_url
)


def test_normalize_website_url():
    # Scheme additions
    assert normalize_website_url("example.com") == "https://example.com"
    assert normalize_website_url("http://example.com") == "http://example.com"
    assert normalize_website_url("//example.com") == "https://example.com"

    # Trailing slash on root
    assert normalize_website_url("https://example.com/") == "https://example.com"

    # Default ports
    assert normalize_website_url("http://example.com:80/path") == "http://example.com/path"
    assert normalize_website_url("https://example.com:443/path") == "https://example.com/path"
    assert normalize_website_url("https://example.com:8443/path") == "https://example.com:8443/path"

    # Hostname casing
    assert normalize_website_url("https://EXAMPLE.COM/About") == "https://example.com/About"

    # Fragment removal
    assert normalize_website_url("https://example.com/page#section-2") == "https://example.com/page"

    # Preserve query string
    assert normalize_website_url("https://example.com/search?q=test#frag") == "https://example.com/search?q=test"


def test_resolve_and_normalize_url():
    base = "https://example.com/blog/article-1"

    # Relative path
    assert resolve_and_normalize_url(base, "article-2") == "https://example.com/blog/article-2"
    assert resolve_and_normalize_url(base, "/about") == "https://example.com/about"
    assert resolve_and_normalize_url(base, "../contact") == "https://example.com/contact"

    # Non-HTTP links
    assert resolve_and_normalize_url(base, "mailto:info@example.com") == ""
    assert resolve_and_normalize_url(base, "tel:+1234567890") == ""
    assert resolve_and_normalize_url(base, "javascript:void(0)") == ""


def test_is_internal_url():
    base = "https://example.com"

    assert is_internal_url(base, "https://example.com/about") is True
    assert is_internal_url(base, "https://www.example.com/pricing") is True
    assert is_internal_url(base, "https://blog.example.com/news") is True
    assert is_internal_url(base, "https://otherdomain.com") is False
    assert is_internal_url(base, "https://example.org") is False
