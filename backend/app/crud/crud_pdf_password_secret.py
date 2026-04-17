from typing import Optional
from sqlalchemy.orm import Session
from app.models.pdf_password_secret import PdfPasswordSecret


def upsert_pdf_password_secret(db: Session, user_id: int, encrypted_password: str) -> PdfPasswordSecret:
    existing = db.query(PdfPasswordSecret).filter(PdfPasswordSecret.user_id == user_id).first()

    if existing:
        existing.encrypted_password = encrypted_password
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    obj = PdfPasswordSecret(user_id=user_id, encrypted_password=encrypted_password)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_pdf_password_secret(db: Session, user_id: int) -> Optional[PdfPasswordSecret]:
    return db.query(PdfPasswordSecret).filter(PdfPasswordSecret.user_id == user_id).first()
