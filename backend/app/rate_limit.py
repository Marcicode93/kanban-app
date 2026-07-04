import time
from collections import defaultdict

_hits: dict[str, list[float]] = defaultdict(list)


def reset_rate_limits() -> None:
    _hits.clear()


def check_rate_limit(key: str, limit: int, window_seconds: int = 3600) -> bool:
    now = time.time()
    recent = [hit for hit in _hits[key] if now - hit < window_seconds]
    if len(recent) >= limit:
        _hits[key] = recent
        return False
    recent.append(now)
    _hits[key] = recent
    return True
