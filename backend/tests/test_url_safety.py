import pytest
from backend.app.services.url_safety import (
    validate_url_safety,
    is_ip_publicly_routable,
    SSRFValidationError
)


def test_ip_publicly_routable():
    # Public routable IPs
    assert is_ip_publicly_routable("8.8.8.8") is True
    assert is_ip_publicly_routable("1.1.1.1") is True
    assert is_ip_publicly_routable("93.184.216.34") is True
    assert is_ip_publicly_routable("2606:4700:4700::1111") is True

    # Loopback
    assert is_ip_publicly_routable("127.0.0.1") is False
    assert is_ip_publicly_routable("127.0.1.1") is False
    assert is_ip_publicly_routable("::1") is False

    # Private IPv4 ranges
    assert is_ip_publicly_routable("10.0.0.1") is False
    assert is_ip_publicly_routable("10.254.0.1") is False
    assert is_ip_publicly_routable("172.16.0.1") is False
    assert is_ip_publicly_routable("172.31.255.255") is False
    assert is_ip_publicly_routable("192.168.1.1") is False
    assert is_ip_publicly_routable("192.168.0.100") is False

    # Link-local & Metadata service
    assert is_ip_publicly_routable("169.254.169.254") is False
    assert is_ip_publicly_routable("169.254.1.1") is False

    # Carrier-grade NAT & 0.0.0.0
    assert is_ip_publicly_routable("0.0.0.0") is False
    assert is_ip_publicly_routable("100.64.0.1") is False

    # Multicast & Unspecified
    assert is_ip_publicly_routable("224.0.0.1") is False
    assert is_ip_publicly_routable("::") is False


def test_ssrf_rejects_forbidden_schemes():
    with pytest.raises(SSRFValidationError, match="Forbidden URL scheme"):
        validate_url_safety("ftp://example.com/file.txt")

    with pytest.raises(SSRFValidationError, match="Forbidden URL scheme"):
        validate_url_safety("file:///etc/passwd")

    with pytest.raises(SSRFValidationError, match="Forbidden URL scheme"):
        validate_url_safety("gopher://127.0.0.1:70")

    with pytest.raises(SSRFValidationError, match="Forbidden URL scheme"):
        validate_url_safety("javascript:alert(1)")


def test_ssrf_rejects_localhost_and_internal_hostnames():
    with pytest.raises(SSRFValidationError, match="Forbidden destination host"):
        validate_url_safety("http://localhost")

    with pytest.raises(SSRFValidationError, match="Forbidden destination host"):
        validate_url_safety("http://localhost:8080/admin")

    with pytest.raises(SSRFValidationError, match="Forbidden destination host"):
        validate_url_safety("http://metadata.google.internal/computeMetadata/v1/")

    with pytest.raises(SSRFValidationError, match="Forbidden destination host"):
        validate_url_safety("http://service.local/api")


def test_ssrf_rejects_private_ip_literals():
    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://127.0.0.1")

    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://127.0.0.1:8000")

    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://10.0.0.1")

    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://172.16.0.1")

    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://192.168.1.1")

    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://169.254.169.254/latest/meta-data/")

    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://[::1]")


def test_ssrf_accepts_valid_public_urls(monkeypatch):
    # Mock DNS resolution to return a known public IP
    monkeypatch.setattr(
        "backend.app.services.url_safety.resolve_hostname_ips",
        lambda host, port=80: ["93.184.216.34"]
    )

    valid, url = validate_url_safety("https://example.com")
    assert valid is True
    assert url == "https://example.com"

    valid, url = validate_url_safety("https://example.com/about?lang=en")
    assert valid is True
