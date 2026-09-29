import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple, List, Optional
import logging

logger = logging.getLogger("barking_dog.url_safety")


class SSRFValidationError(ValueError):
    """Raised when a URL violates SSRF safety constraints."""
    pass


FORBIDDEN_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "ip6-localhost",
    "ip6-loopback",
    "metadata.google.internal",
    "metadata.internal",
    "instance-data",
}

# Special cloud metadata IP addresses
METADATA_IPS = {
    "169.254.169.254",
    "169.254.169.253",
    "fd00:ec2::254"
}


def is_ip_publicly_routable(ip_str: str) -> bool:
    """
    Validate that an IP string is a valid, globally routable public IP address.
    Rejects private, loopback, link-local, multicast, reserved, and unspecified addresses.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False

    if str(ip) in METADATA_IPS:
        return False

    # Check for IPv4 mapped into IPv6 (e.g. ::ffff:127.0.0.1)
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        return is_ip_publicly_routable(str(ip.ipv4_mapped))

    # Reject non-global addresses
    if not ip.is_global:
        return False

    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return False

    # Explicit check for 0.0.0.0/8, 100.64.0.0/10 (CGNAT), 198.18.0.0/15 (Benchmarking)
    if isinstance(ip, ipaddress.IPv4Address):
        octets = ip.exploded.split(".")
        first_octet = int(octets[0])
        if first_octet == 0 or first_octet == 127 or first_octet == 10:
            return False
        if first_octet == 172 and (16 <= int(octets[1]) <= 31):
            return False
        if first_octet == 192 and int(octets[1]) == 168:
            return False
        if first_octet == 169 and int(octets[1]) == 254:
            return False
        if first_octet == 100 and (64 <= int(octets[1]) <= 127):
            return False

    return True


def resolve_hostname_ips(hostname: str, port: int = 80) -> List[str]:
    """Resolve DNS records for the given hostname into a list of unique IP address strings."""
    try:
        addr_info = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
        resolved_ips = set()
        for item in addr_info:
            sockaddr = item[4]
            ip_str = sockaddr[0]
            resolved_ips.add(ip_str)
        return list(resolved_ips)
    except socket.gaierror as exc:
        raise SSRFValidationError(f"Could not resolve hostname '{hostname}': {exc}")


def validate_url_safety(url: str, allow_custom_ports: bool = False) -> Tuple[bool, str]:
    """
    Validate a URL for SSRF protection:
    - Scheme must be http or https
    - Reject local/metadata hostnames
    - Parse port and check standard web ports (80, 443, 8080, 8443)
    - Check if host is direct IP; validate that it's public
    - Resolve DNS and ensure ALL resolved IP addresses are globally routable public IPs.

    Returns (True, normalized_or_validated_url) or raises SSRFValidationError.
    """
    if not url or not isinstance(url, str):
        raise SSRFValidationError("URL cannot be empty.")

    cleaned_url = url.strip()

    try:
        parsed = urlparse(cleaned_url)
    except Exception as exc:
        raise SSRFValidationError(f"Invalid URL structure: {exc}")

    # 1. Scheme validation
    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        raise SSRFValidationError(f"Forbidden URL scheme '{scheme}'. Only HTTP and HTTPS are permitted.")

    # 2. Hostname validation
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise SSRFValidationError("URL is missing a valid hostname.")

    # Check forbidden hostnames
    if hostname in FORBIDDEN_HOSTNAMES or hostname.endswith(".local") or hostname.endswith(".internal"):
        raise SSRFValidationError(f"Forbidden destination host: '{hostname}'.")

    # Check port constraints
    port = parsed.port
    if port is not None and not allow_custom_ports:
        if port not in (80, 443, 8080, 8443):
            raise SSRFValidationError(f"Forbidden destination port: {port}. Only standard web ports are permitted.")

    # Check if hostname itself is an IP literal
    raw_host = hostname.strip("[]")
    is_direct_ip = False
    try:
        ipaddress.ip_address(raw_host)
        is_direct_ip = True
    except ValueError:
        is_direct_ip = False

    if is_direct_ip:
        if not is_ip_publicly_routable(raw_host):
            raise SSRFValidationError(f"Destination IP '{raw_host}' is private, loopback, or not globally routable.")
        return True, cleaned_url

    # 3. DNS Resolution & IP validation
    resolved_ips = resolve_hostname_ips(hostname, port or (443 if scheme == "https" else 80))
    if not resolved_ips:
        raise SSRFValidationError(f"No IP addresses resolved for hostname '{hostname}'.")

    for resolved_ip in resolved_ips:
        if not is_ip_publicly_routable(resolved_ip):
            raise SSRFValidationError(
                f"Hostname '{hostname}' resolved to prohibited non-public IP '{resolved_ip}'."
            )

    return True, cleaned_url
