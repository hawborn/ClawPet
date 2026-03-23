#!/usr/bin/env python3

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from typing import Any


CONFIG_CANDIDATES = [
    ("openclaw", Path("~/.openclaw/openclaw.json").expanduser()),
    ("qclaw", Path("~/.qclaw/openclaw.json").expanduser()),
]


def detect_workspace() -> tuple[str, Path]:
    for source, config_path in CONFIG_CANDIDATES:
        if not config_path.exists():
            continue

        try:
            data = json.loads(config_path.read_text(encoding="utf-8"))
        except Exception:
            continue

        workspace = (
            data.get("agents", {})
            .get("defaults", {})
            .get("workspace")
        )

        if isinstance(workspace, str) and workspace.strip():
            return source, Path(os.path.expanduser(workspace)).resolve()

    return "openclaw", Path("~/.openclaw/workspace").expanduser().resolve()


def resolve_state_path() -> tuple[str, Path]:
    override = os.environ.get("CLAWPET_SOUL_STATE_FILE", "").strip()

    if override:
        return "custom", Path(os.path.expanduser(override)).resolve()

    source, workspace = detect_workspace()
    return source, workspace / "clawpet" / "soul-state.json"


def build_payload(status: str, description: str, source: str) -> dict[str, Any]:
    is_active = status.lower() not in {"off", "offline", "clear"}
    normalized_status = "idle" if not is_active else status

    return {
        "active": is_active,
        "status": normalized_status,
        "description": description.strip(),
        "source": source,
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Write Clawpet soul state for OpenClaw/QClaw integration."
    )
    parser.add_argument("status", help="idle / thinking / coding / running / waiting / error")
    parser.add_argument("description", nargs="?", default="", help="Short task description")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source, state_path = resolve_state_path()
    payload = build_payload(args.status, args.description, source)

    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Clawpet soul state updated: {payload['status']} -> {state_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
