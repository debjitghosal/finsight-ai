from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class AnnualReport(Base):
    __tablename__ = "annual_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    file_name = Column(String(255), nullable=False)
    company_name = Column(String(200), nullable=True)
    report_year = Column(String(50), nullable=True)

    # Extracted raw text (truncated for storage)
    raw_text_preview = Column(Text, nullable=True)

    # AI outputs
    ai_summary = Column(Text, nullable=True)
    financial_data_json = Column(Text, nullable=True)   # JSON string
    investment_insight = Column(Text, nullable=True)

    # Status: pending | processing:parsing_text | etc.
    status = Column(String(50), default="pending")
    error_message = Column(Text, nullable=True)

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
