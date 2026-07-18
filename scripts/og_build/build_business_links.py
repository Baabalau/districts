#!/usr/bin/env python3
"""Generate per-business Open Graph "stub" pages under /v/.

Each stub is a tiny static HTML file that carries business-specific Open Graph
tags (so social scrapers show the business name) and immediately redirects a
real browser to the district vote page with that venue's map popup pre-opened.

Data source: the public `settings/venues_{A-E}` Firestore snapshots (same docs
the district map reads). No auth is needed because `settings` is public-read.

Usage:
    python3 scripts/og_build/build_business_links.py [--prune] [--dry-run]

    --prune    Delete stub files whose venue id is no longer in the snapshots.
               (Default: keep them so an already-shared link never 404s.)
    --dry-run  Report what would change without writing files.
"""

import argparse
import html
import json
import os
import sys
import urllib.request
from urllib.parse import quote

PROJECT_ID = "districts-after-dark"
SITE_ORIGIN = "https://districtsafterdark.com"
DISTRICTS = ["A", "B", "C", "D", "E"]

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "v")

FIRESTORE_URL = (
    "https://firestore.googleapis.com/v1/projects/{project}"
    "/databases/(default)/documents/settings/venues_{district}"
)


def fetch_district_points(district):
    """Return the list of venue point dicts for one district snapshot."""
    url = FIRESTORE_URL.format(project=PROJECT_ID, district=district)
    with urllib.request.urlopen(url, timeout=30) as resp:
        doc = json.load(resp)
    fields = doc.get("fields", {})
    raw = fields.get("points", {}).get("stringValue", "[]")
    try:
        points = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Could not parse points for district {district}: {exc}")
    return points if isinstance(points, list) else []


def collect_venues():
    """Fetch all districts and return a dict of {id: (name, district_letter)}."""
    venues = {}
    for district in DISTRICTS:
        points = fetch_district_points(district)
        for p in points:
            vid = (p.get("id") or "").strip()
            name = (p.get("name") or "").strip()
            if not vid or not name:
                continue
            # Snapshot letter is authoritative; keep the first occurrence.
            venues.setdefault(vid, (name, district))
        print(f"  district {district}: {len(points)} venues")
    return venues


def render_stub(vid, name, district):
    district_lower = district.lower()
    attr_name = html.escape(name, quote=True)
    title_name = html.escape(name, quote=True)
    stub_url = f"{SITE_ORIGIN}/v/{vid}.html"
    canonical = f"{SITE_ORIGIN}/district-{district_lower}.html?vote={quote(vid)}"
    redirect = (
        f"/district-{district_lower}.html?vote={quote(vid)}"
        f"&name={quote(name)}"
    )
    redirect_attr = html.escape(redirect, quote=True)
    redirect_js = json.dumps(redirect)  # safely quoted JS string literal
    og_title = f"Vote for {attr_name} to be our last stop - District {district} Nightcrawl"
    description = (
        f"Help {attr_name} win the District {district} Nightcrawl. "
        "Cast your vote and become a Local Legend."
    )
    og_image = f"{SITE_ORIGIN}/assets/og-district-{district_lower}.png"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vote for {title_name} | Districts After Dark</title>
  <meta name="description" content="{description}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Districts After Dark">
  <meta property="og:title" content="{og_title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{stub_url}">
  <meta property="og:image" content="{og_image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{og_title}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{og_image}">
  <link rel="canonical" href="{canonical}">
  <meta http-equiv="refresh" content="0; url={redirect_attr}">
  <script>location.replace({redirect_js});</script>
</head>
<body>
  <p>Redirecting to your vote... <a href="{redirect_attr}">Click here</a>.</p>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prune", action="store_true",
                        help="Delete stubs whose venue id is gone from the snapshots.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Report changes without writing files.")
    args = parser.parse_args()

    print("Fetching venue snapshots from Firestore...")
    venues = collect_venues()
    print(f"Total unique venues: {len(venues)}")

    if not venues:
        raise SystemExit("No venues found; aborting so existing stubs are left intact.")

    if not args.dry_run:
        os.makedirs(OUT_DIR, exist_ok=True)

    written = 0
    for vid, (name, district) in sorted(venues.items()):
        stub = render_stub(vid, name, district)
        path = os.path.join(OUT_DIR, f"{vid}.html")
        if args.dry_run:
            written += 1
            continue
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(stub)
        written += 1

    pruned = 0
    if os.path.isdir(OUT_DIR):
        existing = {f[:-5] for f in os.listdir(OUT_DIR) if f.endswith(".html")}
        stale = existing - set(venues.keys())
        if args.prune:
            for vid in sorted(stale):
                if not args.dry_run:
                    os.remove(os.path.join(OUT_DIR, f"{vid}.html"))
                pruned += 1
        elif stale:
            print(f"  {len(stale)} stale stub(s) kept (use --prune to remove)")

    verb = "would write" if args.dry_run else "wrote"
    print(f"{verb} {written} stubs to {OUT_DIR}" + (f", pruned {pruned}" if args.prune else ""))


if __name__ == "__main__":
    sys.exit(main())
