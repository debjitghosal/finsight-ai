# backend/app/crud/crud_statement.py

from sqlalchemy.orm import Session
from app.models.statement import Statement

def create_statement(db: Session, user_id: int, filename: str) -> Statement:
    st = Statement(user_id=user_id, file_name=filename)  # ✅ FIXED (file_name)
    db.add(st)
    db.commit()
    db.refresh(st)
    return st
