#!/usr/bin/env python3
"""Compatibility verifier for the v6.8.2 staging release workflow.

The guarded update package performs installation. This tracked helper intentionally
makes no source changes; it verifies that it is being invoked in the staging
repository and directs the operator to RELEASE_PROCEDURE.md.
"""

from pathlib import Path
import subprocess
import sys

EXPECTED_ORIGINS = {
    "https://github.com/edw00rd/botd-app-staging",
    "https://github.com/edw00rd/botd-app-staging.git",
    "git@github.com:edw00rd/botd-app-staging.git",
}
EXPECTED_BRANCH = "release/v6.8.2-staging-rc1"


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], text=True).strip()


def main() -> None:
    if sys.argv[1:]:
        raise SystemExit("No arguments are supported. Use the guarded external update package.")
    root = Path(git("rev-parse", "--show-toplevel")).resolve()
    if Path.cwd().resolve() != root:
        raise SystemExit(f"Run from the repository root: {root}")
    origin = git("remote", "get-url", "origin")
    if origin not in EXPECTED_ORIGINS:
        raise SystemExit(f"Not the staging repository: {origin}")
    branch = git("branch", "--show-current")
    if branch != EXPECTED_BRANCH:
        raise SystemExit(f"Expected {EXPECTED_BRANCH}; found {branch or '(detached HEAD)'}")
    if git("status", "--porcelain"):
        raise SystemExit("Working tree is not clean.")
    print("No installation performed. This v6.8.2 source is already in the staging release workflow.")
    print("Follow RELEASE_PROCEDURE.md for validation, deployment, approval, and promotion.")


if __name__ == "__main__":
    main()
