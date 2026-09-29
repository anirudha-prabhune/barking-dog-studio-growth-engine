from backend.app.services.website_extractor import extract_page_data


def test_extract_page_metadata():
    html = """
    <html lang="en">
      <head>
        <title>Studio Barking Dog — Growth Agency</title>
        <meta name="description" content="AI intelligence and engineering for scale." />
        <link rel="canonical" href="https://barkingdog.studio/canonical-home" />
        <meta property="og:title" content="Studio Barking Dog OG" />
        <meta property="og:description" content="OG Description" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {"@context": "https://schema.org", "@type": "Organization", "name": "Studio Barking Dog"}
        </script>
      </head>
      <body>
        <header>
          <nav>
            <a href="/about">About Us</a>
            <a href="/services">Services</a>
            <a href="https://external.com/partner">Partner</a>
          </nav>
        </header>
        <main>
          <h1>Transforming Growth Engineering</h1>
          <h2>Deterministic Infrastructure</h2>
          <h2>Continuous Discovery</h2>
          <p>We build production-grade web systems and deterministic intelligence layers.</p>
        </main>
      </body>
    </html>
    """

    data = extract_page_data(html, "https://barkingdog.studio")

    assert data.title == "Studio Barking Dog — Growth Agency"
    assert data.meta_description == "AI intelligence and engineering for scale."
    assert data.canonical_url == "https://barkingdog.studio/canonical-home"
    assert data.language == "en"
    assert data.h1 == "Transforming Growth Engineering"
    assert "Deterministic Infrastructure" in data.h2_headings
    assert "Continuous Discovery" in data.h2_headings
    assert data.word_count > 10
    assert len(data.content_hash) == 64
    assert "https://barkingdog.studio/about" in data.internal_links
    assert "https://barkingdog.studio/services" in data.internal_links
    assert "https://external.com/partner" in data.external_links
    assert data.open_graph.get("og:title") == "Studio Barking Dog OG"
    assert data.twitter_card.get("twitter:card") == "summary_large_image"
    assert len(data.json_ld) == 1
    assert data.json_ld[0].get("name") == "Studio Barking Dog"
