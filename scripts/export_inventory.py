#!/usr/bin/env python3
"""Export MaquiFit pages, blog posts, and products with language + Rank Math fields.

Read-only by default. Designed for a live MaquiFit WordPress/WooCommerce site.

Outputs a JSON document containing all pages, blog posts, and products across
FR / EN / ES, grouped by content type and language metadata from WPML.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import shlex
import subprocess
from pathlib import Path
from typing import Any, Dict, List

DEFAULT_HOST = "142.4.198.208"
DEFAULT_PORT = "27"
DEFAULT_USER = "saveurde"
DEFAULT_SITE_PATH = "/home/saveurde/maquifit.ca"
DEFAULT_CONTROL_PATH = os.path.expanduser("~/.ssh/controlmasters/%h-%p-%r")

META_KEYS = [
    "rank_math_title",
    "_rank_math_title",
    "rank_math_description",
    "_rank_math_description",
    "rank_math_focus_keyword",
    "_rank_math_focus_keyword",
    "rank_math_seo_score",
    "_rank_math_seo_score",
]

CONTENT_TYPES = ["product", "page", "post"]
POST_STATUSES = ["publish", "draft", "private", "future"]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--host", default=DEFAULT_HOST)
    p.add_argument("--port", default=DEFAULT_PORT)
    p.add_argument("--user", default=DEFAULT_USER)
    p.add_argument("--site-path", default=DEFAULT_SITE_PATH)
    p.add_argument("--control-path", default=DEFAULT_CONTROL_PATH)
    p.add_argument("--output", default="maquifit_inventory.json", help="Output JSON path")
    return p.parse_args()


def remote_wp(args: argparse.Namespace, inner_cmd: str) -> str:
    ssh_cmd = [
        "ssh",
        "-o",
        f"ControlPath={args.control_path}",
        "-o",
        "ControlMaster=auto",
        "-p",
        str(args.port),
        f"{args.user}@{args.host}",
        inner_cmd,
    ]
    
    password = os.environ.get("MAQUIFIT_SSH_PASS")
    if password:
        ssh_cmd = ["sshpass", "-p", password] + ssh_cmd
    else:
        ssh_cmd.insert(1, "-o")
        ssh_cmd.insert(2, "BatchMode=yes")
        
    proc = subprocess.run(ssh_cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(
            f"Remote command failed with code {proc.returncode}\nSTDERR:\n{proc.stderr}\nSTDOUT:\n{proc.stdout}"
        )
    return proc.stdout


def wp_post_list(args: argparse.Namespace, post_type: str) -> List[Dict[str, Any]]:
    fields = "ID,post_title,post_name,post_status,post_date,post_modified,menu_order"
    remote_cmd = (
        f"cd {shlex.quote(args.site_path)} && "
        f"wp post list --post_type={post_type} --post_status={','.join(POST_STATUSES)} "
        f"--fields={fields} --format=json"
    )
    raw = remote_wp(args, remote_cmd)
    return json.loads(raw)


def wp_query_rows(args: argparse.Namespace, sql: str) -> List[List[str]]:
    encoded = base64.b64encode(sql.encode("utf-8")).decode("ascii")
    remote_cmd = (
        f"cd {shlex.quote(args.site_path)} && "
        f"SQL=$(printf %s {shlex.quote(encoded)} | base64 -d); "
        f"wp db query \"$SQL\" --skip-column-names"
    )
    raw = remote_wp(args, remote_cmd)
    rows: List[List[str]] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("Success:") or "\t" not in line:
            continue
        rows.append(line.split("\t"))
    return rows


def fetch_all_meta(args: argparse.Namespace, post_ids: List[int]) -> Dict[int, Dict[str, str]]:
    if not post_ids:
        return {}
    
    # Batch query in chunks of 150 to avoid huge SQL queries
    chunk_size = 150
    meta_map: Dict[int, Dict[str, str]] = {pid: {k: "" for k in META_KEYS} for pid in post_ids}
    keys = ",".join(f"'{k}'" for k in META_KEYS)
    
    for i in range(0, len(post_ids), chunk_size):
        chunk = post_ids[i:i + chunk_size]
        id_list = ",".join(str(pid) for pid in chunk)
        sql = (
            "SELECT post_id, meta_key, meta_value "
            "FROM wp_postmeta "
            f"WHERE post_id IN ({id_list}) AND meta_key IN ({keys})"
        )
        try:
            for row in wp_query_rows(args, sql):
                if len(row) < 3:
                    continue
                pid = int(row[0])
                key = row[1]
                value = row[2]
                if pid in meta_map and key in meta_map[pid]:
                    meta_map[pid][key] = value
        except Exception as e:
            print(f"Error fetching metadata chunk: {e}")
            
    return meta_map


def build_items_for_type(args: argparse.Namespace, post_type: str) -> List[Dict[str, Any]]:
    status_list = ",".join(f"'{s}'" for s in POST_STATUSES)
    sql = (
        "SELECT p.ID, p.post_type, p.post_status, "
        "p.post_title, p.post_name, p.post_date, p.post_modified, p.menu_order, "
        "COALESCE(t.language_code, ''), COALESCE(t.trid, ''), COALESCE(t.source_language_code, '') "
        "FROM wp_posts p "
        "JOIN wp_icl_translations t ON t.element_id = p.ID AND t.element_type = CONCAT('post_', p.post_type) "
        f"WHERE p.post_type = '{post_type}' AND p.post_status IN ({status_list}) "
        "ORDER BY p.menu_order, p.post_title, t.language_code"
    )
    rows = wp_query_rows(args, sql)
    
    post_ids = []
    parsed_rows = []
    for row in rows:
        if len(row) not in (10, 11):
            raise SystemExit(f"Unexpected column count {len(row)} for {post_type}: {row!r}")
        post_ids.append(int(row[0]))
        parsed_rows.append(row)
        
    # Bulk fetch all metadata in one query
    meta_map = fetch_all_meta(args, post_ids)
    
    items: List[Dict[str, Any]] = []
    for row in parsed_rows:
        post_id = int(row[0])
        meta = meta_map.get(post_id, {k: "" for k in META_KEYS})
        source_language_code = row[10] if len(row) > 10 else None
        items.append(
            {
                "id": post_id,
                "post_type": row[1],
                "post_status": row[2],
                "post_title": row[3],
                "post_name": row[4],
                "post_date": row[5],
                "post_modified": row[6],
                "menu_order": int(row[7]) if row[7] else 0,
                "language_code": row[8],
                "trid": int(row[9]) if row[9] else None,
                "source_language_code": source_language_code or None,
                "rank_math_title": meta.get("rank_math_title", "") or meta.get("_rank_math_title", ""),
                "rank_math_description": meta.get("rank_math_description", "") or meta.get("_rank_math_description", ""),
                "rank_math_focus_keyword": meta.get("rank_math_focus_keyword", "") or meta.get("_rank_math_focus_keyword", ""),
                "rank_math_seo_score": meta.get("rank_math_seo_score", "") or meta.get("_rank_math_seo_score", ""),
            }
        )
    return items


def main() -> int:
    args = parse_args()

    grouped: Dict[str, List[Dict[str, Any]]] = {"page": [], "post": [], "product": []}
    language_counts: Dict[str, Dict[str, int]] = {}

    for post_type in CONTENT_TYPES:
        items = build_items_for_type(args, post_type)
        grouped[post_type] = items
        for item in items:
            lang = item["language_code"] or "unknown"
            language_counts.setdefault(lang, {"page": 0, "post": 0, "product": 0})
            language_counts[lang][post_type] += 1

    total = sum(len(v) for v in grouped.values())
    inventory = {
        "site": {
            "name": "MaquiFit",
            "host": args.host,
            "port": int(args.port),
            "site_path": args.site_path,
            "languages": ["fr", "en", "es"],
        },
        "counts": {
            "pages": len(grouped["page"]),
            "posts": len(grouped["post"]),
            "products": len(grouped["product"]),
            "total": total,
        },
        "language_counts": language_counts,
        "items": grouped,
    }

    out_path = Path(args.output)
    out_path.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(out_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
