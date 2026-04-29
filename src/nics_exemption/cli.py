"""Command-line entry point for the NICs exemption pipeline.

Exposes a :func:`main` callable that ``[project.scripts]`` registers as
``nics-exemption-build`` and that ``__main__.py`` invokes for
``python -m nics_exemption``.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from .pipeline import run


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="nics-exemption-build",
        description="Generate dashboard-ready NICs exemption policy results.",
    )
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--lfs-path", type=Path, required=True)
    parser.add_argument("--effective-marginal-rate", type=float, required=True)
    parser.add_argument("--elasticity-low", type=float, required=True)
    parser.add_argument("--elasticity-central", type=float, required=True)
    parser.add_argument("--elasticity-high", type=float, required=True)
    cut_group = parser.add_mutually_exclusive_group(required=True)
    cut_group.add_argument(
        "--benefit-cut-rate",
        type=float,
        help="Explicit proportional cut to PIP+DLA (e.g. 0.1 for 10%%).",
    )
    cut_group.add_argument(
        "--benefit-cut-target-bn",
        type=float,
        help=(
            "Calibrate the PIP+DLA cut rate so the modelled fiscal saving "
            "matches this target (in £bn). E.g. 4.8 to match the Spring "
            "Statement 2025 Pathways to Work green-paper headline saving."
        ),
    )
    parser.add_argument("--benefit-cut-elasticity", type=float, required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    run(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
