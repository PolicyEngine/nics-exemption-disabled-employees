from __future__ import annotations

import argparse
from pathlib import Path

from .pipeline import (
    DEFAULT_DASHBOARD_OUTPUT_PATH,
    DEFAULT_OUTPUT_PATH,
    DEFAULT_YEAR,
    generate_results_file,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate dashboard-ready NICs exemption policy results."
    )
    parser.add_argument("--year", type=int, default=DEFAULT_YEAR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument(
        "--sync-dashboard",
        action="store_true",
        help="Copy the generated JSON into dashboard/public/data/ as well.",
    )
    parser.add_argument(
        "--dashboard-output",
        type=Path,
        default=DEFAULT_DASHBOARD_OUTPUT_PATH,
    )
    parser.add_argument(
        "--lfs-path",
        type=str,
        default=None,
        help="Path to the LFS longitudinal dataset (tab-separated). "
        "If provided, inactivity transitions are imputed onto the FRS.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    results = generate_results_file(
        year=args.year,
        output_path=args.output,
        sync_dashboard=args.sync_dashboard,
        dashboard_output_path=args.dashboard_output,
        lfs_path=args.lfs_path,
    )
    print(f"Results saved to {args.output}")
    if args.sync_dashboard:
        print(f"Dashboard data synced to {args.dashboard_output}")

    if "nics_exemption" in results:
        nics = results["nics_exemption"]
        print(
            f"Summary: total employer NICs = "
            f"{nics['total_employer_nics_bn']}bn, "
            f"recently active = {nics['nics_recently_active_bn']}bn"
        )
    elif "baseline" in results:
        bl = results["baseline"]
        print(
            f"Summary: total employer NICs = "
            f"{bl['total_employer_nics_bn']}bn, "
            f"working-age population = {bl['n_working_age']:,}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
