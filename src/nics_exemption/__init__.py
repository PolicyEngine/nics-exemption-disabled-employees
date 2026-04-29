"""NICs exemption modelling helpers and pipeline.

The full pipeline (``run_pipeline.py`` at the repo root, or the
``nics-exemption-build`` console script) is implemented in
:mod:`nics_exemption.pipeline`; this top-level module re-exports the
public interface so callers can write::

    from nics_exemption import run, build_lfs_transition_targets
"""

from importlib.metadata import PackageNotFoundError, version

from .lfs import LFS_INACTIVITY_COLS, build_lfs_transition_targets
from .pipeline import run

try:
    __version__ = version("nics-exemption")
except PackageNotFoundError:
    __version__ = "0.0.0+unknown"

__all__ = [
    "LFS_INACTIVITY_COLS",
    "__version__",
    "build_lfs_transition_targets",
    "run",
]
