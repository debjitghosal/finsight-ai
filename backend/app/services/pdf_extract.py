from __future__ import annotations

from typing import List, Optional, Dict, Any
import pdfplumber

def _clean_text(x: Optional[str]) -> str:
    return (x or "").replace("\n", " ").strip()

def _to_float(x: Optional[str]) -> Optional[float]:
    if x is None:
        return None
    s = x.replace(",", "").strip()
    if not s:
        return None
    # supports +150.00, -89.00 transaction amounts
    try:
        return float(s)
    except ValueError:
        return None

def extract_transactions_from_pdf(
    pdf_path: str,
    pdf_password: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Extracts transactions from the statement table and ignores the confidential header section.
    Returns rows as dicts:
      raw_date, description, reference, debit, credit, balance
    """
    txns: List[Dict[str, Any]] = []

    # table extraction settings that work better for ruled/column tables
    table_settings = {
        "vertical_strategy": "lines",
        "horizontal_strategy": "lines",
        "snap_tolerance": 3,
        "join_tolerance": 3,
        "intersection_tolerance": 3,
        "min_words_vertical": 1,
        "min_words_horizontal": 1,
    }

    with pdfplumber.open(pdf_path, password=pdf_password) as pdf:
        for page in pdf.pages:
            # --- IMPORTANT: ignore top confidential part ---
            # Crop to lower area where transaction table is (tune this if needed).
            # 0,0 is top-left in pdfplumber.
            w, h = page.width, page.height
            cropped = page.crop((0, h * 0.18, w, h))  # keep bottom 82%

            tables = cropped.extract_tables(table_settings=table_settings) or []
            for table in tables:
                for row in table:
                    if not row or len(row) < 6:
                        continue

                    date_cell = _clean_text(row[0])
                    details = _clean_text(row[1])
                    reference = _clean_text(row[2])
                    debit_s = _clean_text(row[3])
                    credit_s = _clean_text(row[4])
                    balance_s = _clean_text(row[5])

                    # skip header row
                    if date_cell.lower() == "date" or "transaction details" in details.lower():
                        continue

                    # skip opening balance row
                    if "opening balance" in details.lower():
                        continue

                    debit = _to_float(debit_s)
                    credit = _to_float(credit_s)
                    balance = _to_float(balance_s)

                    # Decide txn type + amount from columns
                    if debit is not None and debit != 0:
                        txn_type = "debit"
                        amount = abs(debit)  # store positive amount
                    elif credit is not None and credit != 0:
                        txn_type = "credit"
                        amount = abs(credit)
                    else:
                        # no amount found
                        continue

                    txns.append({
                        "raw_date": date_cell,
                        "description": details,
                        "reference": reference,
                        "amount": amount,
                        "txn_type": txn_type,
                        "balance": balance,
                    })

    return txns
