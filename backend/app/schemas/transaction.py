from pydantic import BaseModel
from datetime import date
from typing import Optional

class TransactionCreate(BaseModel):
    txn_date: date
    description: str
    amount: float
    txn_type: str  # "debit" / "credit"
    balance: Optional[float] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
