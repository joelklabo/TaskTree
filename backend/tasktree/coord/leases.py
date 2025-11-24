from __future__ import annotations

import json
import logging
import random
import time
from pathlib import Path

from tasktree.coord.constitution import constitution
from tasktree.settings import settings

LEASES_DIR = (settings.base_dir / "leases").resolve()
LEASES_DIR.mkdir(exist_ok=True)
logger = logging.getLogger(__name__)


class LeaseError(Exception):
    pass


class Lease:
    def __init__(self, path: Path, holder: str, issued_at: float, ttl: int):
        self.path = path
        self.holder = holder
        self.issued_at = issued_at
        self.ttl = ttl

    @property
    def expired(self) -> bool:
        return time.time() > self.issued_at + self.ttl

    def renew(self) -> None:
        self.issued_at = time.time()
        self.path.write_text(
            json.dumps(
                {
                    "holder": self.holder,
                    "issuedAt": int(self.issued_at),
                    "ttl": self.ttl,
                },
                indent=2,
            )
        )


def lease_path(resource: str) -> Path:
    safe = resource.replace("/", "_")
    return LEASES_DIR / f"{safe}.lock"


def read_lease(path: Path) -> Lease | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        return Lease(
            path=path,
            holder=data["holder"],
            issued_at=float(data["issuedAt"]),
            ttl=int(data["ttl"]),
        )
    except FileNotFoundError:
        # File disappeared between exists() check and read_text(); treat as missing.
        return None
    except (json.JSONDecodeError, KeyError, TypeError):
        # Corrupt or incomplete lease file; log and treat as missing.
        try:
            size = path.stat().st_size
            logger.warning(
                "Corrupt lease file removed",
                extra={"lease_path": str(path), "size": size},
            )
        except OSError:
            logger.warning("Corrupt lease file removed", extra={"lease_path": str(path)})
        path.unlink(missing_ok=True)
        return None


def acquire(resource: str, holder: str) -> Lease:
    c = constitution()
    ttl = c.ttl_seconds
    path = lease_path(resource)

    retries = 0
    while True:
        existing = read_lease(path)
        now = time.time()

        if not existing or existing.expired:
            lease = Lease(path, holder, now, ttl)
            lease.renew()
            return lease

        retries += 1
        if retries > c.max_retries:
            raise LeaseError(f"failed to acquire lease on {resource} after {retries} retries")

        backoff = random.uniform(*c.backoff_seconds)  # nosec B311 - jitter only
        logger.warning(
            "Lease held, backing off",
            extra={
                "resource": resource,
                "holder": holder,
                "retry": retries,
                "backoff": round(backoff, 2),
            },
        )
        time.sleep(backoff)


def release(lease: Lease) -> None:
    lease.path.unlink(missing_ok=True)
