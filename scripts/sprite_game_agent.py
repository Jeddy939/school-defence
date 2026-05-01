#!/usr/bin/env python3
"""Copy QA-approved extracted sprites into the game."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXTRACTED_ROOT = PROJECT_ROOT / "generated" / "extracted-sprites"
QA_ROOT = PROJECT_ROOT / "generated" / "sprite-qa"
PUBLIC_SPRITES_ROOT = PROJECT_ROOT / "public" / "sprites"


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def add_unit(unit: str, allow_unapproved: bool, run_audit: bool) -> None:
    extracted = EXTRACTED_ROOT / unit
    if not (extracted / "metadata.json").exists():
        raise SystemExit(f"No extracted sprites found for {unit}. Run sprites:extract first.")

    qa_report_path = QA_ROOT / unit / "qa-report.json"
    qa_report = load_json(qa_report_path)
    if not allow_unapproved and not qa_report.get("approved_for_game_import"):
        raise SystemExit(f"{unit} has not passed QA. Run sprites:check, or pass --allow-unapproved.")

    public_root = PUBLIC_SPRITES_ROOT / unit
    if public_root.exists():
        shutil.rmtree(public_root)
    shutil.copytree(extracted, public_root)
    print(f"{unit}: copied QA-staged sprites into {public_root}")

    if run_audit:
        subprocess.run([sys.executable, str(PROJECT_ROOT / "scripts" / "audit_sprite_assets.py")], check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Add QA-approved extracted sprites to public/sprites.")
    parser.add_argument("--unit", required=True)
    parser.add_argument("--allow-unapproved", action="store_true")
    parser.add_argument("--no-audit", action="store_true")
    args = parser.parse_args()
    add_unit(args.unit, args.allow_unapproved, run_audit=not args.no_audit)


if __name__ == "__main__":
    main()
