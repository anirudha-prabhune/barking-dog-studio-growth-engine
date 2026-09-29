from backend.app.services.tech_detector import detect_technologies


def test_detect_wordpress():
    html = """
    <html>
      <head>
        <meta name="generator" content="WordPress 6.4.2" />
        <link rel="stylesheet" href="/wp-content/themes/twentytwentyfour/style.css" />
      </head>
      <body><h1>WP Site</h1></body>
    </html>
    """
    techs = detect_technologies("https://example.com", html, {})
    names = [t["technology"] for t in techs]
    assert "WordPress" in names


def test_detect_shopify():
    html = """
    <html>
      <head>
        <script src="https://cdn.shopify.com/s/files/1/0000/shop.js"></script>
      </head>
      <body>Shopify Store</body>
    </html>
    """
    headers = {"X-Shopify-Stage": "production"}
    techs = detect_technologies("https://store.example.com", html, headers)
    names = [t["technology"] for t in techs]
    assert "Shopify" in names


def test_detect_nextjs_and_react():
    html = """
    <html>
      <head>
        <script id="__NEXT_DATA__" type="application/json">{}</script>
      </head>
      <body>
        <div id="__next" data-reactroot=""><h1>Hello Next</h1></div>
      </body>
    </html>
    """
    headers = {"X-Powered-By": "Next.js"}
    techs = detect_technologies("https://nextjs.example.com", html, headers)
    names = [t["technology"] for t in techs]
    assert "Next.js" in names
    assert "React" in names


def test_detect_analytics_and_gtm():
    html = """
    <html>
      <head>
        <!-- Google Tag Manager -->
        <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-XXXX');</script>
        <script src="https://js.hs-scripts.com/1234567.js"></script>
      </head>
      <body>Marketing</body>
    </html>
    """
    techs = detect_technologies("https://marketing.example.com", html, {})
    names = [t["technology"] for t in techs]
    assert "Google Tag Manager" in names
    assert "HubSpot" in names


def test_detect_cloudflare():
    headers = {"Server": "cloudflare", "cf-ray": "823908129301923-DFW"}
    techs = detect_technologies("https://secure.example.com", "<html><body>Secure</body></html>", headers)
    names = [t["technology"] for t in techs]
    assert "Cloudflare" in names
