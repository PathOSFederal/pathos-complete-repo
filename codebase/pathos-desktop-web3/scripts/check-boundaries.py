"""
============================================================================
BOUNDARY CHECK SCRIPT
============================================================================

Enforces architectural boundaries for the monorepo packages:

1. packages/core     -- MUST NOT import next/*, electron/*, react-router*
2. packages/ui       -- MUST NOT import next/*, electron/*, react-router*
3. packages/adapters -- MUST NOT import next/*, electron/*, react-router*
   (adapter interfaces only; implementations live in apps/)

Run: pnpm check:boundaries
============================================================================
"""

import os
import re
import sys

# Use absolute path for sandbox compatibility (__file__ may not be defined)
ROOT = "/vercel/share/v0-project"

FORBIDDEN_PATTERNS = [
    # Next.js
    re.compile(r"""from\s+['"]next/"""),
    re.compile(r"""require\(\s*['"]next/"""),
    re.compile(r"""import\s+['"]next/"""),
    # Electron
    re.compile(r"""from\s+['"]electron['"]"""),
    re.compile(r"""require\(\s*['"]electron['"]"""),
    re.compile(r"""import\s+['"]electron['"]"""),
    # React Router (only allowed in apps/)
    re.compile(r"""from\s+['"]react-router"""),
    re.compile(r"""require\(\s*['"]react-router"""),
    re.compile(r"""import\s+['"]react-router"""),
]

PACKAGES_TO_CHECK = [
    ("packages/core", os.path.join(ROOT, "packages", "core", "src")),
    ("packages/ui", os.path.join(ROOT, "packages", "ui", "src")),
    ("packages/adapters", os.path.join(ROOT, "packages", "adapters", "src")),
]

SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}


def collect_source_files(directory):
    """Recursively collect all source files in a directory."""
    results = []
    if not os.path.isdir(directory):
        return results
    for dirpath, _, filenames in os.walk(directory):
        for filename in filenames:
            _, ext = os.path.splitext(filename)
            if ext in SOURCE_EXTENSIONS:
                results.append(os.path.join(dirpath, filename))
    return results


def check_file(filepath):
    """Check a single file for forbidden imports."""
    violations = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            for pattern in FORBIDDEN_PATTERNS:
                if pattern.search(line):
                    violations.append({
                        "line": line_num,
                        "text": line.strip(),
                        "pattern": pattern.pattern,
                    })
    return violations


def main():
    total_violations = 0
    report = []

    for pkg_name, pkg_dir in PACKAGES_TO_CHECK:
        files = collect_source_files(pkg_dir)
        for filepath in files:
            violations = check_file(filepath)
            if violations:
                rel_path = os.path.relpath(filepath, ROOT)
                total_violations += len(violations)
                for v in violations:
                    report.append(
                        f"  VIOLATION: {rel_path}:{v['line']} -- {v['text']}"
                    )

    if total_violations > 0:
        print(f"\nBoundary check FAILED: {total_violations} violation(s) found.\n")
        for line in report:
            print(line)
        print(
            "\nPackages (core, ui, adapters) must not import next/*, electron/*, or react-router*."
        )
        print(
            "Platform-specific implementations belong in apps/web or apps/desktop.\n"
        )
        sys.exit(1)
    else:
        print(
            f"\nBoundary check PASSED: 0 violations across {len(PACKAGES_TO_CHECK)} packages.\n"
        )
        sys.exit(0)


if __name__ == "__main__":
    main()
