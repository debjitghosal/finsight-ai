from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user

from app.models.statement import Statement
from app.models.transaction import Transaction
from app.models.pdf_password_secret import PdfPasswordSecret

from app.core.crypto import encrypt_text, decrypt_text
from app.services.pdf_service import extract_transactions_from_pdf
from app.services.categorizer import categorize_description

router = APIRouter(prefix="/statements", tags=["Statements"])


@router.post("/upload")
async def upload_statement(
    file: UploadFile = File(...),
    pdf_password: str = Form(""),          # allow empty if saved exists
    save_password: bool = Form(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    pdf_bytes = await file.read()

    # If user didn't provide password, try using saved one
    if not pdf_password:
        saved = db.query(PdfPasswordSecret).filter(
            PdfPasswordSecret.user_id == current_user.id,
            PdfPasswordSecret.is_active == True  # noqa: E712
        ).first()

        if not saved:
            raise HTTPException(
                status_code=400,
                detail="PDF password required (no saved password found)."
            )
        try:
            pdf_password = decrypt_text(saved.encrypted_password)
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Saved PDF password could not be decrypted. Re-enter password."
            )

    # If user wants to save password, store encrypted (replaces existing)
    if save_password:
        encrypted = encrypt_text(pdf_password)
        existing = db.query(PdfPasswordSecret).filter(
            PdfPasswordSecret.user_id == current_user.id
        ).first()

        if existing:
            existing.encrypted_password = encrypted
            existing.is_active = True
        else:
            db.add(PdfPasswordSecret(
                user_id=current_user.id,
                encrypted_password=encrypted,
                is_active=True
            ))
        db.commit()

    # Parse transactions (currently stub but validates password works)
    try:
        txns = extract_transactions_from_pdf(pdf_bytes, password=pdf_password)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to open PDF. Wrong PDF password or unsupported statement."
        )

    # Create Statement row
    stmt = Statement(
        user_id=current_user.id,
        file_name=file.filename,
        cnn_saved=save_password  # internal column name OK
    )
    db.add(stmt)
    db.commit()
    db.refresh(stmt)

    created = 0

    # Insert extracted txns (will be 0 until Step 7C parsing)
    for t in txns:
        category_id, subcategory_id = categorize_description(db, t.get("description", ""))

        txn = Transaction(
            statement_id=stmt.id,
            user_id=current_user.id,
            txn_date=t["txn_date"],
            description=t["description"],
            amount=t["amount"],
            txn_type=t["txn_type"],
            merchant=t.get("merchant"),
            category_id=category_id,
            subcategory_id=subcategory_id,
        )
        db.add(txn)
        created += 1

    db.commit()

    return {
        "statement_id": stmt.id,
        "transactions_created": created,
        "note": "Parsing is stub right now; next step will extract real transactions."
    }
