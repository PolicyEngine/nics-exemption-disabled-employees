"""Thin shim — kept for backward compatibility.

The pipeline lives in the :mod:`nics_exemption` package now. Prefer the
console script (``nics-exemption-build`` after installing the package)
or ``python -m nics_exemption`` over invoking this file directly.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from nics_exemption.cli import main  # noqa: E402  -- import after sys.path setup

if __name__ == "__main__":
    raise SystemExit(main())
