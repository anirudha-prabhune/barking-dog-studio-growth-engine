from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from backend.app.core.config import settings
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.api import auth, companies, dashboard, health
from backend.app.services.auth_service import AuthService
from contextlib import asynccontextmanager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("barking_dog")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist (fallback/development bootstrap before Alembic migration)
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            admin = AuthService.ensure_initial_admin(db)
            logger.info(f"Verified initial admin user: {admin.email}")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL on startup (verify docker-compose): {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Internal AI-powered lead-generation intelligence platform for Studio Barking Dog (Pass 1 Foundation)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Consistent error handling: { "error": { "code": "...", "message": "..." } }
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    
    code = "HTTP_ERROR"
    if exc.status_code == 404:
        code = "NOT_FOUND"
    elif exc.status_code == 401:
        code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        code = "FORBIDDEN"
    elif exc.status_code == 400:
        code = "BAD_REQUEST"

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": str(exc.detail)}}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    msg = first_error.get("msg", "Invalid request parameters")
    loc = " -> ".join([str(l) for l in first_error.get("loc", [])])
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"{loc}: {msg}" if loc else msg,
                "details": errors
            }
        }
    )


# Mount routers
app.include_router(health.router)
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(companies.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
