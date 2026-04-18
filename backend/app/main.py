from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.db.session import engine
from app.db.base import Base

from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.settings import router as settings_router
from app.api.routes.statements import router as statements_router
from app.api.routes.annual_reports import router as annual_reports_router  # NEW

app = FastAPI(
    title="FinSight AI",
    description="Secure Financial Analyser with AI Assistance",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://finsight-ai-smoky.vercel.app",
        "https://finsight-ai.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(settings_router)
app.include_router(statements_router)
app.include_router(annual_reports_router)  # Mounted!

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    
    # Safely alter the status column on Postgres for the longer status strings
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            if engine.dialect.name == 'postgresql':
                conn.execute(text("ALTER TABLE annual_reports ALTER COLUMN status TYPE VARCHAR(50);"))
    except Exception as e:
        print(f"Startup DB alteration skipped: {e}")
    
    # Ensure static dirs exist
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("outputs", exist_ok=True)

@app.get("/")
def root():
    return {"status": "FinSight AI backend running"}
