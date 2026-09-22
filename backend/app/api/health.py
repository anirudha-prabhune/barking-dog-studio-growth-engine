from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(response: Response, db: Session = Depends(get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "service": "Barking Dog Growth Engine"
    }
