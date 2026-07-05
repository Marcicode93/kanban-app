import time
from collections import defaultdict
from datetime import timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.db.models import RateLimitHit
from app.verification import utc_now

_hits: dict[str, list[float]] = defaultdict(list)


def reset_rate_limits() -> None:
    _hits.clear()


def check_rate_limit(
    key: str,
    limit: int,
    window_seconds: int = 3600,
    db: Session | None = None,
) -> bool:
    if db is not None:
        cutoff = utc_now() - timedelta(seconds=window_seconds)
        db.execute(delete(RateLimitHit).where(RateLimitHit.created_at < cutoff))
        count = db.scalar(
            select(func.count())
            .select_from(RateLimitHit)
            .where(
                RateLimitHit.key == key,
                RateLimitHit.created_at >= cutoff,
            )
        )
        if (count or 0) >= limit:
            db.commit()
            return False
        db.add(RateLimitHit(key=key, created_at=utc_now()))
        db.commit()
        return True

    now = time.time()
    recent = [hit for hit in _hits[key] if now - hit < window_seconds]
    if len(recent) >= limit:
        _hits[key] = recent
        return False
    recent.append(now)
    _hits[key] = recent
    return True
