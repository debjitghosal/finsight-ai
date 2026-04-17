from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.annual_report import AnnualReport
from datetime import datetime

def create_annual_report(
    db: Session,
    user_id: int,
    file_name: str,
    company_name: Optional[str] = None,
    report_year: Optional[str] = None,
) -> AnnualReport:
    report = AnnualReport(
        user_id=user_id,
        file_name=file_name,
        company_name=company_name,
        report_year=report_year,
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

def get_annual_report(db: Session, report_id: int, user_id: int) -> Optional[AnnualReport]:
    return (
        db.query(AnnualReport)
        .filter(AnnualReport.id == report_id, AnnualReport.user_id == user_id)
        .first()
    )

def list_annual_reports(db: Session, user_id: int) -> List[AnnualReport]:
    return (
        db.query(AnnualReport)
        .filter(AnnualReport.user_id == user_id)
        .order_by(AnnualReport.uploaded_at.desc())
        .all()
    )

def update_report_analysis(
    db: Session,
    report: AnnualReport,
    ai_summary: str,
    financial_data_json: str,
    investment_insight: str,
    raw_text_preview: str,
    status: str = "done",
    error_message: Optional[str] = None,
    detected_company: Optional[str] = None,
    detected_year: Optional[str] = None,
) -> AnnualReport:
    report.ai_summary = ai_summary
    report.financial_data_json = financial_data_json
    report.investment_insight = investment_insight
    report.raw_text_preview = raw_text_preview
    report.status = status
    report.error_message = error_message
    report.processed_at = datetime.utcnow()
    
    if detected_company and (not report.company_name or str(report.company_name).strip() == ""):
        report.company_name = detected_company
    
    if detected_year and not report.report_year:
        report.report_year = detected_year

    db.commit()
    db.refresh(report)
    return report

def update_report_basic(db: Session, report_id: int, user_id: int, company_name: Optional[str], report_year: Optional[str], ticker: Optional[str] = None) -> Optional[AnnualReport]:
    report = get_annual_report(db, report_id, user_id)
    if report:
        if company_name is not None:
            report.company_name = company_name
        if report_year is not None:
            report.report_year = report_year
        
        if ticker is not None:
            import json
            try:
                data = json.loads(report.financial_data_json) if report.financial_data_json else {}
            except:
                data = {}
            data["ticker"] = ticker
            report.financial_data_json = json.dumps(data)
            
        db.commit()
        db.refresh(report)
    return report

def mark_report_error(db: Session, report: AnnualReport, error_message: str) -> AnnualReport:
    report.status = "error"
    report.error_message = error_message
    db.commit()
    db.refresh(report)
    return report

def delete_annual_report(db: Session, report_id: int, user_id: int) -> bool:
    report = get_annual_report(db, report_id, user_id)
    if report:
        db.delete(report)
        db.commit()
        return True
    return False
