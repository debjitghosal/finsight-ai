from pydantic import BaseModel
from datetime import datetime

class StatementOut(BaseModel):
    id: int
    file_name: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class StatementUploadResponse(BaseModel):
    statement_id: int
    transactions_inserted: int
