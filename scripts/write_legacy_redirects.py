#!/usr/bin/env python3
"""Write noindex static redirects for retired URLs on GitHub Pages.

GitHub Pages has no server redirects. Each old URL becomes a small HTML file
with a meta refresh, a canonical link, robots noindex, and a visible link.
Trailing-slash paths are written as index.html inside that directory.
Paths that end in .html are written at that file.

The script does not edit sitemap.xml.

Usage:
  python3 scripts/write_legacy_redirects.py --dry-run urls.txt
  python3 scripts/write_legacy_redirects.py urls.txt

Each line is an old URL or path. An optional second field overrides the target.
Blank lines and lines starting with # are ignored.

Automatic targets:
  /prop-*.html and /mes-proprietes/...  -> /proprietes.html
  /ca/qc/<city>/...                     -> /regions/<city>.html if that page
                                            exists, otherwise /proprietes.html
  /trucs-astuces-informations/...       -> the current article whose filename
                                            shares the most tokens, or /blog.html
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://chiassondefrancesco.ca"
STOP = {
    "a", "au", "aux", "de", "des", "du", "en", "et", "la", "le", "les",
    "un", "une", "ou", "pour", "sur", "dans", "d", "l", "html", "index",
}


def normalize_path(raw: str) -> str:
    text = raw.strip()
    if text.startswith(BASE):
        text = text[len(BASE):]
    if not text.startswith("/"):
        text = "/" + text
    return text.split("?", 1)[0].split("#", 1)[0]


def region_slugs() -> set[str]:
    folder = ROOT / "regions"
    return {p.stem for p in folder.glob("*.html")}


def article_files() -> list[str]:
    return sorted(p.name for p in ROOT.glob("article-*.html"))


def tokens(text: str) -> set[str]:
    cleaned = text.lower().replace(".html", "").replace("/", " ")
    for ch in "-_.":
        cleaned = cleaned.replace(ch, " ")
    return {part for part in cleaned.split() if len(part) > 2 and part not in STOP}


def closest_article(old_path: str) -> str:
    old_tokens = tokens(old_path.rsplit("/", 1)[-1])
    best_name = ""
    best_score = 0
    for name in article_files():
        score = len(old_tokens & tokens(name))
        if score > best_score:
            best_score = score
            best_name = name
    if best_score >= 2 and best_name:
        return "/" + best_name
    return "/blog.html"


def choose_target(old_path: str, regions: set[str]) -> str:
    path = old_path.rstrip("/")
    name = path.rsplit("/", 1)[-1]
    if name.startswith("prop-") or path.startswith("/mes-proprietes"):
        return "/proprietes.html"
    if path.startswith("/ca/qc/"):
        parts = [part for part in path.split("/") if part]
        # ca / qc / city / ...
        city = parts[2] if len(parts) > 2 else ""
        if city in regions:
            return f"/regions/{city}.html"
        return "/proprietes.html"
    if path.startswith("/trucs-astuces-informations"):
        return closest_article(path)
    return "/blog.html"


def destination_file(old_path: str) -> Path:
    relative = old_path.lstrip("/")
    if relative.endswith(".html"):
        return ROOT / relative
    if relative.endswith("/"):
        relative = relative[:-1]
    return ROOT / relative / "index.html"


def is_stub(path: Path) -> bool:
    if not path.exists():
        return True
    text = path.read_text(encoding="utf-8", errors="replace")
    return 'http-equiv="refresh"' in text and 'name="robots"' in text and len(text) < 2500


def page_html(target_url: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="fr-CA">
<head>
  <meta charset="utf-8">
  <title>Page déplacée</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="{target_url}">
  <meta http-equiv="refresh" content="0; url={target_url}">
</head>
<body>
  <p>Cette adresse a changé. <a href="{target_url}">Continuer vers la page actuelle</a>.</p>
</body>
</html>
"""


def parse_lines(text: str) -> list[tuple[str, str | None]]:
    rows = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        parts = stripped.split()
        old = normalize_path(parts[0])
        override = normalize_path(parts[1]) if len(parts) > 1 else None
        rows.append((old, override))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("urls", type=Path, help="Text file of old URLs, one per line")
    parser.add_argument("--dry-run", action="store_true", help="Print the mapping without writing files")
    args = parser.parse_args()
    regions = region_slugs()
    rows = parse_lines(args.urls.read_text(encoding="utf-8"))
    if not rows:
        print("No URLs to redirect.", file=sys.stderr)
        return 1
    for old, override in rows:
        target_path = override or choose_target(old, regions)
        target_url = BASE + target_path
        dest = destination_file(old)
        if not is_stub(dest):
            print(f"SKIP existing page {dest.relative_to(ROOT)}", file=sys.stderr)
            continue
        print(f"{old} -> {target_path}")
        if args.dry_run:
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(page_html(target_url), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
