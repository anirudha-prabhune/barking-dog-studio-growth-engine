import redis
from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(response: Response, db: Session = Depends(get_db)):
    db_status = "ok"
    redis_status = "ok"

    # PostgreSQL reachability check
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unreachable: {str(e)}"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    # Redis reachability check
    try:
        r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=1, socket_timeout=1)
        if not r.ping():
            redis_status = "unhealthy"
    except Exception:
        redis_status = "unreachable"

    overall_status = "ok" if db_status == "ok" else "degraded"

    return {
        "status": overall_status,
        "database": "ok" if db_status == "ok" else db_status,
        "redis": redis_status,
        "service": settings.PROJECT_NAME
    }

