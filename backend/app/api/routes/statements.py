# backend/app/api/routes/statements.py

from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from tempfile import NamedTemporaryFile
from dateutil import parser as date_parser

from app.api import deps
from app.crud.crud_statement import create_statement
from app.crud.crud_transaction import create_transactions_bulk
from app.schemas.statement import StatementUploadResponse
from app.services.pdf_extract import extract_transactions_from_pdf

# Step 7D
from app.crud.crud_pdf_password_secret import (
    upsert_pdf_password_secret,
    get_pdf_password_secret,
)
from app.core.crypto import encrypt_text, decrypt_text

router = APIRouter(prefix="/statements", tags=["statements"])


@router.post("/upload", response_model=StatementUploadResponse)
def upload_statement(
    file: UploadFile = File(...),
    pdf_password: Optional[str] = Form(None),
    save_password: bool = Form(False),
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_user),
):
    # Support PDF only for now in this endpoint (we’ll add images next)
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Save uploaded PDF to a temp file
    with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        contents = file.file.read()
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        file.file.close()
    except Exception:
        pass

    # Create statement record
    statement = create_statement(db=db, user_id=current_user.id, filename=file.filename)

    # -------- Step 7D: Resolve password (user provided -> else saved) --------
    resolved_password: Optional[str] = pdf_password

    if not resolved_password:
        secret = get_pdf_password_secret(db, current_user.id)
        if secret:
            try:
                resolved_password = decrypt_text(secret.encrypted_password)
            except Exception:
                resolved_password = None

    # Extract transactions from PDF
    try:
        raw_txns = extract_transactions_from_pdf(tmp_path, pdf_password=resolved_password)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to read PDF. If it is password-protected, provide the PDF password.",
        )

    # Save password if asked (only if user provided one)
    if pdf_password and save_password:
        enc = encrypt_text(pdf_password)
        upsert_pdf_password_secret(db, current_user.id, enc)

    if not raw_txns:
        return {"statement_id": statement.id, "transactions_inserted": 0}

    # Normalize rows for DB insert (match your Transaction model)
    normalized = []
    for t in raw_txns:
        dt = date_parser.parse(t["raw_date"], dayfirst=True).date()
        normalized.append(
            {
                "txn_date": dt,
                "description": t["description"],
                "amount": t["amount"],
                "txn_type": t["txn_type"],
                "merchant": None,
                "category_id": None,
                "subcategory_id": None,
            }
        )

    inserted = create_transactions_bulk(
        db=db,
        statement_id=statement.id,
        user_id=current_user.id,
        items=normalized,
    )

    return {"statement_id": statement.id, "transactions_inserted": inserted}
