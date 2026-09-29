import re
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup


def detect_technologies(
    url: str,
    html: str,
    headers: Dict[str, str],
    soup: Optional[BeautifulSoup] = None
) -> List[Dict[str, Any]]:
    """
    Deterministic detection of web technologies and analytics tools from:
    - HTML meta generator and link tags
    - Script source patterns and inline identifiers
    - Response headers (Server, X-Powered-By, cf-ray, etc.)
    - Asset path signatures (wp-content, static/chunks, cdn.shopify.com)

    Returns list of:
    {
        "technology": str,
        "confidence": float,
        "evidence": str,
        "source_url": str
    }
    """
    if soup is None and html:
        soup = BeautifulSoup(html, "html.parser")

    results: List[Dict[str, Any]] = []
    seen_techs = set()

    def add_tech(name: str, confidence: float, evidence: str):
        if name not in seen_techs:
            seen_techs.add(name)
            results.append({
                "technology": name,
                "confidence": confidence,
                "evidence": evidence,
                "source_url": url
            })

    # Normalized headers
    lower_headers = {k.lower(): v for k, v in headers.items()}
    html_lower = html.lower() if html else ""

    # 1. Cloudflare
    if "cf-ray" in lower_headers or lower_headers.get("server", "").lower().startswith("cloudflare"):
        add_tech("Cloudflare", 1.0, f"Cloudflare header detected (Server: {lower_headers.get('server', '')}, CF-RAY present)")
    elif "__cfwaitingroom" in html_lower or "/cdn-cgi/" in html_lower:
        add_tech("Cloudflare", 0.95, "Cloudflare challenge/CDN assets (/cdn-cgi/) detected in markup")

    # 2. Meta Generator inspection
    if soup:
        meta_gen = soup.find("meta", attrs={"name": re.compile(r"^generator$", re.I)})
        if meta_gen and meta_gen.get("content"):
            gen_content = meta_gen.get("content", "").strip()
            gen_lower = gen_content.lower()

            if "wordpress" in gen_lower:
                add_tech("WordPress", 1.0, f"Meta generator explicitly states: '{gen_content}'")
            elif "shopify" in gen_lower:
                add_tech("Shopify", 1.0, f"Meta generator explicitly states: '{gen_content}'")
            elif "webflow" in gen_lower:
                add_tech("Webflow", 1.0, f"Meta generator explicitly states: '{gen_content}'")
            elif "wix" in gen_lower:
                add_tech("Wix", 1.0, f"Meta generator explicitly states: '{gen_content}'")
            elif "squarespace" in gen_lower:
                add_tech("Squarespace", 1.0, f"Meta generator explicitly states: '{gen_content}'")
            elif "drupal" in gen_lower:
                add_tech("Drupal", 1.0, f"Meta generator explicitly states: '{gen_content}'")
            elif "next.js" in gen_lower or "nextjs" in gen_lower:
                add_tech("Next.js", 1.0, f"Meta generator explicitly states: '{gen_content}'")

    # 3. WordPress Detection
    if "WordPress" not in seen_techs:
        if "wp-content/" in html_lower or "wp-includes/" in html_lower:
            add_tech("WordPress", 1.0, "WordPress asset directories ('wp-content/' or 'wp-includes/') found in HTML")
        elif "wp-json/" in html_lower:
            add_tech("WordPress", 0.9, "WordPress REST API endpoint ('wp-json/') referenced in links")

    # 4. Shopify Detection
    if "Shopify" not in seen_techs:
        if "cdn.shopify.com" in html_lower or "shopify.theme" in html_lower or "window.shopify" in html_lower:
            add_tech("Shopify", 1.0, "Shopify CDN assets or Shopify JavaScript objects detected")
        elif "x-shopify-stage" in lower_headers:
            add_tech("Shopify", 1.0, "Shopify HTTP response header 'X-Shopify-Stage' detected")

    # 5. Webflow Detection
    if "Webflow" not in seen_techs:
        if "assets.website-files.com" in html_lower or "webflow.js" in html_lower or 'data-wf-page' in html_lower:
            add_tech("Webflow", 1.0, "Webflow HTML data attributes ('data-wf-page') or assets detected")

    # 6. Wix Detection
    if "Wix" not in seen_techs:
        if "wix.com" in html_lower or "wixstatic.com" in html_lower or "_wix" in html_lower:
            add_tech("Wix", 1.0, "Wix asset hostnames ('wixstatic.com') or initialization markers detected")

    # 7. Squarespace Detection
    if "Squarespace" not in seen_techs:
        if "squarespace.com" in html_lower or "static1.squarespace.com" in html_lower or "squarespace-headers" in html_lower:
            add_tech("Squarespace", 1.0, "Squarespace static CDN or headers detected in markup")

    # 8. Drupal Detection
    if "Drupal" not in seen_techs:
        if "drupal.js" in html_lower or "/sites/default/files" in html_lower or "drupalsettings" in html_lower:
            add_tech("Drupal", 1.0, "Drupal directory structure or drupalSettings JS object detected")
        elif "x-drupal-cache" in lower_headers:
            add_tech("Drupal", 1.0, "Drupal cache response header 'X-Drupal-Cache' detected")

    # 9. Next.js Detection
    if "Next.js" not in seen_techs:
        if "__next" in html_lower or "/_next/static" in html_lower or 'id="__next"' in html_lower:
            add_tech("Next.js", 1.0, "Next.js container 'id=\"__next\"' or '/_next/static' bundles detected")
        elif lower_headers.get("x-powered-by", "").lower() == "next.js":
            add_tech("Next.js", 1.0, "X-Powered-By header indicates Next.js")

    # 10. React Detection (if Next.js is present or React markers exist)
    if "React" not in seen_techs:
        if 'data-reactroot' in html_lower or 'data-reactid' in html_lower or 'react.production.min.js' in html_lower:
            add_tech("React", 1.0, "React DOM attributes ('data-reactroot') or bundled script detected")
        elif "Next.js" in seen_techs:
            add_tech("React", 1.0, "Underlying framework for Next.js application")

    # 11. Google Tag Manager (GTM)
    if "googletagmanager.com/gtm.js" in html_lower or "gtm-" in html_lower or "www.googletagmanager.com" in html_lower:
        add_tech("Google Tag Manager", 1.0, "Google Tag Manager script container ('googletagmanager.com/gtm.js') detected")

    # 12. Google Analytics (GA4 / Universal Analytics)
    if "google-analytics.com/analytics.js" in html_lower or "gtag('js'" in html_lower or "gtag(\"js\"" in html_lower or "gtag/js?id=" in html_lower:
        add_tech("Google Analytics", 1.0, "Google Analytics / gtag.js tracking script detected")

    # 13. Adobe Analytics / Adobe Experience Platform
    if "adobedtm.com" in html_lower or "assets.adobedtm.com" in html_lower or "omniture" in html_lower or "appmeasurement.js" in html_lower:
        add_tech("Adobe Analytics", 1.0, "Adobe DTM / Launch tag manager or AppMeasurement script detected")

    # 14. HubSpot
    if "js.hs-scripts.com" in html_lower or "hs-analytics" in html_lower or "hubspot.com" in html_lower or "js.hsforms.net" in html_lower:
        add_tech("HubSpot", 1.0, "HubSpot tracking code ('js.hs-scripts.com') or forms integration detected")

    # 15. OneTrust (Consent Management)
    if "cdn.cookielaw.org" in html_lower or "onetrust" in html_lower or "optanon" in html_lower:
        add_tech("OneTrust", 1.0, "OneTrust cookie compliance banner / Optanon library ('cdn.cookielaw.org') detected")

    return results
