from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger("barking_dog.robots")


class RobotsPolicy:
    def __init__(self, raw_content: Optional[str] = None, base_url: str = ""):
        self.raw_content = raw_content
        self.base_url = base_url
        self.parser = RobotFileParser()
        self.sitemaps: List[str] = []
        self.has_robots: bool = False

        if raw_content:
            self.has_robots = True
            lines = raw_content.splitlines()
            self.parser.parse(lines)
            
            # Extract sitemaps defined in robots.txt
            for line in lines:
                stripped = line.strip()
                if stripped.lower().startswith("sitemap:"):
                    parts = stripped.split(":", 1)
                    if len(parts) > 1:
                        sitemap_url = parts[1].strip()
                        if sitemap_url:
                            self.sitemaps.append(sitemap_url)

    def is_allowed(self, url: str, user_agent: str = "*") -> bool:
        """
        Check if user_agent is allowed to crawl the given URL according to robots.txt.
        If robots.txt was not available or empty, allow by default within the crawler's depth/page limits.
        """
        if not self.has_robots:
            return True
        try:
            return self.parser.can_fetch(user_agent, url)
        except Exception:
            return True


def build_robots_url(target_url: str) -> str:
    """Build the canonical /robots.txt URL for a given target site."""
    parsed = urlparse(target_url)
    scheme = parsed.scheme or "https"
    netloc = parsed.netloc
    return f"{scheme}://{netloc}/robots.txt"
