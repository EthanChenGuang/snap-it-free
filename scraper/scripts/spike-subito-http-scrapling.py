#!/usr/bin/env python3
"""D-15 Scrapling HTTP arm — same 3 Subito URLs as spike-subito-http-category.mjs.

Run via spike-subito-http-compare.mjs (creates isolated venv) or manually:
  /tmp/scrapling-spike-venv/bin/python scraper/scripts/spike-subito-http-scrapling.py

Writes JSON to path in SPIKE_SCRAPLING_JSON env or stdout.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from typing import Any

TARGET_URLS = [
    {
        "label": "Venezia arredamento-casalinghi",
        "url": "https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/",
    },
    {
        "label": "Padova arredamento-casalinghi",
        "url": "https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/padova/padova/",
    },
    {
        "label": "Veneto elettrodomestici (high volume)",
        "url": "https://www.subito.it/annunci-veneto/regalo/elettrodomestici/",
    },
]

LISTING_ARRAY_PATH = "props.pageProps.initialState.items.originalList"
WALL_TIME_PASS_MS = 2000
ARM = "scrapling-fetcher"


def parse_external_id(url: str | None) -> str | None:
    if not url:
        return None
    match = re.search(r"-(\d+)\.htm(?:\?|$)", url)
    return match.group(1) if match else None


def get_by_path(obj: Any, dot_path: str) -> Any:
    cur = obj
    for key in dot_path.split("."):
        if cur is None:
            return None
        cur = cur.get(key) if isinstance(cur, dict) else None
    return cur


def extract_price(features: dict[str, Any] | None) -> str | None:
    if not features:
        return None
    price = features.get("/price")
    if not isinstance(price, dict):
        return None
    values = price.get("values") or []
    if not values:
        return None
    first = values[0]
    if not isinstance(first, dict):
        return None
    return first.get("value") or first.get("key")


def extract_listing(item: dict[str, Any]) -> dict[str, Any]:
    urls = item.get("urls") or {}
    external_url = urls.get("default") or urls.get("mobile")
    images = [
        img.get("cdnBaseUrl")
        for img in (item.get("images") or [])
        if isinstance(img, dict) and img.get("cdnBaseUrl")
    ]
    return {
        "external_id": parse_external_id(external_url),
        "title": item.get("subject"),
        "price": extract_price(item.get("features")),
        "images": images,
        "posted_at": item.get("date"),
        "external_url": external_url,
    }


def field_complete(listing: dict[str, Any]) -> bool:
    return bool(
        listing.get("external_id")
        and listing.get("title")
        and listing.get("price") is not None
        and len(listing.get("images") or []) > 0
        and listing.get("posted_at")
    )


def extract_next_data(html: str) -> tuple[str | None, dict[str, Any] | None]:
    match = re.search(
        r'<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>',
        html,
        re.IGNORECASE,
    )
    if not match:
        return "missing __NEXT_DATA__", None
    try:
        return None, json.loads(match.group(1))
    except json.JSONDecodeError as err:
        return f"JSON parse error: {err}", None


def is_blocked(status: int, html: str, headers: dict[str, Any]) -> bool:
    if status == 403:
        return True
    snippet = html[:5000].lower()
    if any(token in snippet for token in ("blocked", "captcha", "access denied")):
        return True
    block_header = headers.get("x-subito-block") or headers.get("X-Subito-Block") or ""
    return "blocked" in str(block_header).lower()


def fetch_category(label: str, url: str, proxy_url: str | None) -> dict[str, Any]:
    from scrapling.fetchers import Fetcher

    row: dict[str, Any] = {
        "label": label,
        "url": url,
        "arm": ARM,
        "status": 0,
        "wallMs": 0,
        "blocked": False,
        "listingCount": 0,
        "sample": None,
        "fieldMapOk": False,
        "error": None,
        "pass": False,
    }

    kwargs: dict[str, Any] = {
        "impersonate": "chrome",
        "stealthy_headers": True,
        "timeout": 15,
        "retries": 1,
    }
    if proxy_url:
        kwargs["proxy"] = proxy_url

    t0 = time.perf_counter()
    try:
        page = Fetcher.get(url, **kwargs)
        row["wallMs"] = round((time.perf_counter() - t0) * 1000)
        row["status"] = int(getattr(page, "status", 0) or 0)
        body = getattr(page, "body", b"")
        html = body.decode("utf-8", errors="replace") if isinstance(body, bytes) else str(body)
        headers = dict(getattr(page, "headers", {}) or {})
        row["blocked"] = is_blocked(row["status"], html, headers)

        err, data = extract_next_data(html)
        if err:
            row["error"] = err
            return row

        raw_list = get_by_path(data, LISTING_ARRAY_PATH)
        if not isinstance(raw_list, list) or len(raw_list) == 0:
            row["error"] = f"empty or missing listing array at {LISTING_ARRAY_PATH}"
            return row

        listings = [extract_listing(item) for item in raw_list if isinstance(item, dict)]
        row["listingCount"] = len(listings)
        row["sample"] = listings[0] if listings else None
        row["fieldMapOk"] = any(field_complete(item) for item in listings)
        row["pass"] = (
            row["status"] == 200
            and not row["blocked"]
            and row["fieldMapOk"]
            and row["wallMs"] <= WALL_TIME_PASS_MS
        )
        return row
    except Exception as err:  # noqa: BLE001 — spike script surfaces all failures
        row["wallMs"] = round((time.perf_counter() - t0) * 1000)
        row["error"] = str(err)
        return row


def main() -> int:
    proxy_url = os.environ.get("SCRAPER_PROXY_URL") or os.environ.get("HTTP_PROXY")
    results = [fetch_category(t["label"], t["url"], proxy_url) for t in TARGET_URLS]
    payload = {
        "arm": ARM,
        "proxyConfigured": bool(proxy_url),
        "wallTimePassMs": WALL_TIME_PASS_MS,
        "results": results,
        "allPass": all(r["pass"] for r in results),
        "blockedCount": sum(1 for r in results if r["blocked"] or r["status"] != 200),
        "avgWallMs": round(sum(r["wallMs"] for r in results) / len(results)),
    }

    out_path = os.environ.get("SPIKE_SCRAPLING_JSON")
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    if out_path:
        with open(out_path, "w", encoding="utf-8") as fh:
            fh.write(text)
    else:
        sys.stdout.write(text)

    return 0 if payload["allPass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
