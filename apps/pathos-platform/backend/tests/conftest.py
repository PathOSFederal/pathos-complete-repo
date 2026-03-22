"""Pytest conftest: set USAJOBS env before any app import so Settings() can load."""
import os
import sys
from pathlib import Path

# Set before any test module imports app (config loads at first app import).
os.environ.setdefault("USAJOBS_API_KEY", "test-key-for-pytest")
os.environ.setdefault("USAJOBS_USER_AGENT", "PathOSAdvisor (test@pathosadvisor.com)")
os.environ.setdefault("PATHOS_ENV", "test")
os.environ["DB_DIALECT"] = "sqlite"

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
