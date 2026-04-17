from pydantic import BaseModel
from typing import Optional, Any, Dict, Union
from datetime import datetime

class AnnualReportCreate(BaseModel):
    company_name: Optional[str] = None
    report_year: Optional[Any] = None

class AnnualReportUpdate(BaseModel):
    company_name: Optional[str] = None
    report_year: Optional[Any] = None
    ticker: Optional[str] = None

class AnnualReportRead(BaseModel):
    id: int
    user_id: int
    file_name: str
    company_name: Optional[str] = None
    report_year: Optional[Any] = None
    ai_summary: Optional[str] = None
    financial_data_json: Optional[str] = None
    investment_insight: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AnnualReportListItem(BaseModel):
    id: int
    file_name: str
    company_name: Optional[str] = None
    report_year: Optional[Any] = None
    status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class AskQuestionRequest(BaseModel):
    question: str

class AskQuestionResponse(BaseModel):
    question: str
    answer: str
    report_id: int

class MultiAskQuestionRequest(BaseModel):
    report_ids: list[int]
    question: str

class MultiAskQuestionResponse(BaseModel):
    report_ids: list[int]
    question: str
    answer: str

class CompareReportsRequest(BaseModel):
    report_ids: list[int]

class CompareReportsResponse(BaseModel):
    report_ids: list[int]
    comparison: str

class MultiCompareReportsRequest(BaseModel):
    report_ids: list[int]

class AnalyticsResponse(BaseModel):
    report_ids: list[int]
    chart_data: list[Dict[str, Any]]
    ai_comparison: str

class WhatsAppSendRequest(BaseModel):
    phone_number: str  # e.g. "+919876543210"
