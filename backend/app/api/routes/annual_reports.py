import os
import json
import time
import shutil
import pdfplumber
import pypdfium2
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.config import settings

from app.models.user import User
from app.models.annual_report import AnnualReport
from app.schemas.annual_report import (
    AnnualReportRead,
    AnnualReportListItem,
    AnnualReportUpdate,
    AskQuestionRequest,
    AskQuestionResponse,
    CompareReportsRequest,
    CompareReportsResponse,
    MultiCompareReportsRequest,
    AnalyticsResponse,
    MultiAskQuestionRequest,
    MultiAskQuestionResponse,
    WhatsAppSendRequest
)
from app.crud import crud_annual_report
from app.services import ai_service
from app.services import excel_service
from app.services import whatsapp_service
from app.services.investment_advisor import get_investment_advice
import logging

logging.getLogger("pdfminer").setLevel(logging.ERROR)
logging.getLogger("PyPDF2").setLevel(logging.ERROR)
logging.getLogger("pypdf").setLevel(logging.ERROR)

router = APIRouter(prefix="/reports", tags=["Annual Reports"])


def process_report_background(report_id: int, user_id: int, file_path: str):
    """Background task to run AI analysis with true multi-threading to halve wait times."""
    from app.db.session import SessionLocal
    import concurrent.futures
    db = SessionLocal()
    
    report = crud_annual_report.get_annual_report(db, report_id, user_id)
    if not report:
        db.close()
        return

    def update_status(new_status: str):
        report.status = new_status
        db.commit()

    try:
        # Phase 0: Extraction
        update_status("processing:parsing_text")
        text = ""
        try:
            import pypdfium2 as pdfium
            with pdfium.PdfDocument(file_path) as pdf:
                # We take up to 300 pages which is plenty for 1M chars, 
                # while avoiding infinite loops on corrupted massive files.
                for i in range(min(len(pdf), 400)):
                    page = pdf.get_page(i)
                    textpage = page.get_textpage()
                    text += textpage.get_text_range()
                    if len(text) > 1000000:
                        text = text[:1000000]
                        break
        except Exception as e:
            print(f"Pypdfium2 Error: {e}")
            # Final emergency fallback if library fails
            text = "PDF Content Extraction Failed."

        # Phase 1: Structuring
        update_status("processing:init")
        
        print(f"[{datetime.now()}] STARTING ANALYSIS for Report {report_id}...")

        results = {}
        # PARALLEL PIPELINE: Total tasks reduced from 4 -> 2 for maximum throughput
        # We combine PnL, Balance Sheet, and Highlights into a single "fin" pipeline hit.
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            future_to_tag = {
                executor.submit(ai_service.extract_financial_pipeline, text): "fin_pipeline",
                executor.submit(ai_service.summarize_report, text): "sum"
            }
            
            # Monitoring loop for Heartbeat
            start_time = time.time()
            all_done = False
            while not all_done:
                done, not_done = concurrent.futures.wait(
                    future_to_tag.keys(), timeout=15, return_when=concurrent.futures.ALL_COMPLETED
                )
                if len(not_done) == 0:
                    all_done = True
                else:
                    elapsed = int(time.time() - start_time)
                    print(f"[{datetime.now()}] HEARTBEAT: Still analyzing Report {report_id}... ({elapsed}s elapsed)")
            
            for future in future_to_tag:
                tag = future_to_tag[future]
                results[tag] = future.result()
        
        # Merge structured results
        fin_data = results.get("fin_pipeline") or {}
        ai_summary = results.get("sum") or "Summary generation failed."

        update_status("processing:summary_done")
        
        # Phase 2: Synthesis
        update_status("processing:insights")
        invest_insight = get_investment_advice(fin_data, ai_summary)

        detected_company = fin_data.get("company_name", "")
        detected_year_val = fin_data.get("fiscal_year", "")
        detected_year_str = str(detected_year_val) if detected_year_val else None

        # Phase 3: Committal
        update_status("processing:finalizing")
        fin_data_str = json.dumps(fin_data)
        
        crud_annual_report.update_report_analysis(
            db=db,
            report=report,
            ai_summary=ai_summary,
            financial_data_json=fin_data_str,
            investment_insight=invest_insight,
            raw_text_preview=text, # Store EVERYTHING
            status="done",
            detected_company=detected_company,
            detected_year=detected_year_str
        )
        
    except Exception as e:
        import traceback
        error_detail = f"Analysis failed during {report.status}: {str(e)}\n{traceback.format_exc()}"
        # Construct a back-link for the mobile user
        backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000")
        url = f"{backend_url}/reports/{report_id}"
        print(f"[{datetime.now()}] ERROR processing Report {report_id}: {error_detail}")
        crud_annual_report.mark_report_error(db, report, f"Analysis failed: {str(e)}")
    finally:
        db.close()
        # Persist file for future exports/downloads
        print(f"[{datetime.now()}] Background analysis complete for Report {report_id}. File persisted.")





@router.post("/metadata-scan")
async def scan_metadata(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        pdf_bytes = await file.read()
        import io
        text = ""
        document_title = "Unknown"
        document_author = "Unknown"
        
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            # Extract invisible embedded PDF metadata for the Golden Trio Pipeline
            meta_dict = pdf.metadata if getattr(pdf, "metadata", None) else {}
            document_title = meta_dict.get("Title", "Unknown")
            document_author = meta_dict.get("Author", "Unknown")

            # ONLY scan first 10 pages for maximum speed
            limit = min(10, len(pdf.pages))
            for i in range(limit):
                page_text = pdf.pages[i].extract_text()
                if page_text:
                    text += page_text + "\n"
        
        meta = ai_service.extract_metadata(
            text=text[:80000],
            filename=file.filename,
            pdf_title=str(document_title),
            pdf_author=str(document_author)
        )
        return meta
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=AnnualReportRead)
async def upload_annual_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    company_name: str = Form(None),
    report_year: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    # Create record
    report = crud_annual_report.create_annual_report(
        db=db,
        user_id=current_user.id,
        file_name=file.filename,
        company_name=company_name,
        report_year=report_year
    )
    
    # NEW: Instant Save & Background Processing
    try:
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        file_path = upload_dir / f"report_{report.id}.pdf"
        
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Dispatch background task with file path
        background_tasks.add_task(process_report_background, report.id, current_user.id, str(file_path))
        
    except Exception as e:
        crud_annual_report.mark_report_error(db, report, f"Failed to save file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize report processing.")
    
    return report


@router.get("/", response_model=list[AnnualReportListItem])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_annual_report.list_annual_reports(db, current_user.id)


@router.get("/{report_id}", response_model=AnnualReportRead)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = crud_annual_report.get_annual_report(db, report_id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.patch("/{report_id}", response_model=AnnualReportRead)
def update_report(
    report_id: int,
    update_data: AnnualReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    year_str = str(update_data.report_year) if update_data.report_year else None
    report = crud_annual_report.update_report_basic(
        db=db,
        report_id=report_id,
        user_id=current_user.id,
        company_name=update_data.company_name,
        report_year=year_str,
        ticker=update_data.ticker
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = crud_annual_report.delete_annual_report(db, report_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found or already deleted")
    return {"status": "success", "message": "Report deleted"}


@router.post("/{report_id}/ask", response_model=AskQuestionResponse)
def ask_question(
    report_id: int,
    request: AskQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = crud_annual_report.get_annual_report(db, report_id, current_user.id)
    # Chatbot context: Use the FULL TEXT stored in DB for precise answering
    context = f"Document Content:\n{report.raw_text_preview}\n\nAI Summary: {report.ai_summary}"
    answer = ai_service.answer_question(context, request.question)
    
    return {
        "question": request.question,
        "answer": answer,
        "report_id": report_id
    }

@router.post("/{report_id}/ask-stream")
def ask_question_stream(
    report_id: int,
    request: AskQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = crud_annual_report.get_annual_report(db, report_id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    context = f"Document Content:\n{report.raw_text_preview[:500000]}\n\nAI Summary: {report.ai_summary}"
    # Creating a quick stream wrapper for the singular answer
    prompt = ai_service.QA_PROMPT.format(text=context, question=request.question)
    stream = ai_service._fast_generate_stream(prompt)
    return StreamingResponse(stream, media_type="text/event-stream")

@router.post("/multi-ask", response_model=MultiAskQuestionResponse)
def multi_ask_question(
    request: MultiAskQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reports = db.query(AnnualReport).filter(
        AnnualReport.id.in_(request.report_ids), 
        AnnualReport.user_id == current_user.id
    ).all()
    
    if len(reports) != len(request.report_ids):
        raise HTTPException(status_code=404, detail="One or more reports not found")
        
    contexts = []
    labels = []
    for r in reports:
        labels.append(f"{r.company_name or 'Report'} {r.report_year or ''}")
        # Use full document text for multi-report comparisons/Q&A
        contexts.append(f"Document: {r.company_name}\nContent:\n{r.raw_text_preview}\nSummary: {r.ai_summary}")
        
    answer = ai_service.multi_answer_question(contexts, labels, request.question)
    
    return {
        "report_ids": request.report_ids,
        "question": request.question,
        "answer": answer
    }


@router.post("/multi-ask-stream")
def multi_ask_question_stream(
    request: MultiAskQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reports = db.query(AnnualReport).filter(
        AnnualReport.id.in_(request.report_ids), 
        AnnualReport.user_id == current_user.id
    ).all()
    
    if len(reports) != len(request.report_ids):
        raise HTTPException(status_code=404, detail="One or more reports not found")
        
    contexts = []
    labels = []
    for r in reports:
        labels.append(f"{r.company_name or 'Report'} {r.report_year or ''}")
        contexts.append(f"Document: {r.company_name}\nData: {r.financial_data_json}\nSummary: {r.ai_summary}")
        
    stream = ai_service.multi_answer_question_stream(contexts, labels, request.question)
    return StreamingResponse(stream, media_type="text/event-stream")

@router.post("/global-ask-stream")
def global_ask_stream(
    request: AskQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reports = db.query(AnnualReport).filter(
        AnnualReport.user_id == current_user.id,
        AnnualReport.status == 'done'
    ).order_by(AnnualReport.uploaded_at.desc()).all()
    
    contexts = []
    labels = []
    for r in reports:
        labels.append(f"{r.company_name or 'Report'} {r.report_year or ''}")
        contexts.append(f"Document: {r.company_name}\nData: {r.financial_data_json}\nSummary: {r.ai_summary}")
        
    stream = ai_service.global_answer_question_stream(contexts, labels, request.question)
    return StreamingResponse(stream, media_type="text/event-stream")

@router.post("/compare", response_model=CompareReportsResponse)
def compare_reports(
    request: CompareReportsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if len(request.report_ids) < 2 or len(request.report_ids) > 10:
        raise HTTPException(status_code=400, detail="Please select between 2 to 10 reports.")
        
    reports = db.query(AnnualReport).filter(
        AnnualReport.id.in_(request.report_ids), 
        AnnualReport.user_id == current_user.id
    ).all()
    
    if len(reports) != len(request.report_ids):
        raise HTTPException(status_code=404, detail="One or more reports not found")
        
    report_dict = {r.id: r for r in reports}
    reports = [report_dict[rid] for rid in request.report_ids if rid in report_dict]
        
    texts = []
    labels = []
    for r in reports:
        texts.append(f"Data: {r.financial_data_json}\nSummary: {r.ai_summary}")
        labels.append(f"{r.company_name or 'Report'} {r.report_year or ''}")
        
    comparison = ai_service.multi_compare_reports(texts, labels)
    
    return {
        "report_ids": request.report_ids,
        "comparison": comparison
    }

def clean_currency_to_number(val_str: str) -> float:
    """Utility to turn '₹17,942.67 Crores' into ~ 17942.67 for charting."""
    if not val_str or str(val_str).strip() in ["", "N/A", "string", "null", "None"]: return 0.01
    import re
    clean = re.sub(r'[^\d.-]', '', str(val_str))
    try: return float(clean)
    except: return 0.01

@router.post("/analytics", response_model=AnalyticsResponse)
def generate_analytics(
    request: MultiCompareReportsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if len(request.report_ids) < 1 or len(request.report_ids) > 10:
        raise HTTPException(status_code=400, detail="Please select between 1 to 10 reports.")
        
    reports = db.query(AnnualReport).filter(
        AnnualReport.id.in_(request.report_ids), 
        AnnualReport.user_id == current_user.id
    ).all()
    
    if len(reports) != len(request.report_ids):
        raise HTTPException(status_code=404, detail="Mismatch in found reports.")
        
    report_dict = {r.id: r for r in reports}
    reports = [report_dict[rid] for rid in request.report_ids if rid in report_dict]
        
    texts = []
    labels = []
    chart_data = []
    
    for r in reports:
        label = f"{r.company_name or 'Report'} {r.report_year or ''}"
        t = f"Data: {r.financial_data_json}\nSummary: {r.ai_summary}"
        texts.append(t)
        labels.append(label)
        
        try:
            f_data = json.loads(r.financial_data_json) if r.financial_data_json else {}
        except:
            f_data = {}
            
        chart_data.append({
            "name": label,
            "revenue": clean_currency_to_number(f_data.get("revenue", "0")),
            "netProfit": clean_currency_to_number(f_data.get("net_profit", "0")),
            "ebitda": clean_currency_to_number(f_data.get("ebitda", "0"))
        })
        
    ai_comparison = ai_service.multi_compare_reports(texts, labels) if len(texts) > 1 else "Insights generated for a single company trendline are available in the summary section."
    
    return {
        "report_ids": request.report_ids,
        "chart_data": chart_data,
        "ai_comparison": ai_comparison
    }

from app.services import pdf_service

@router.get("/{report_id}/export/pdf")
def export_pdf(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = crud_annual_report.get_annual_report(db, report_id, current_user.id)
    if not report or report.status != "done":
        raise HTTPException(status_code=400, detail="Report not ready for export")
        
    fin_data = json.loads(report.financial_data_json) if report.financial_data_json else {}
    
    try:
        pdf_bytes = pdf_service.generate_pdf_report(
            financial_data=fin_data,
            ai_summary=report.ai_summary,
            investment_insight=report.investment_insight,
            company_name=report.company_name,
            report_year=report.report_year
        )
        
        import re
        # Aggressively sanitize filename for HTTP Header compatibility
        clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '', (report.company_name or 'report'))
        filename = f"finsight_{clean_name}_{report.report_year or ''}.pdf"
        
        # Force charset for the Disposition header
        disposition = f'attachment; filename="{filename}"'
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": disposition}
        )
    except Exception as e:
        import traceback
        print(f"PDF GENERATION ERROR: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.post("/{report_id}/whatsapp")
def send_whatsapp(
    report_id: int,
    request: WhatsAppSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = crud_annual_report.get_annual_report(db, report_id, current_user.id)
    if not report or report.status != "done":
        raise HTTPException(status_code=400, detail="Report not ready")
        
    fin_data = json.loads(report.financial_data_json) if report.financial_data_json else {}
    
    msg_body = ai_service.generate_whatsapp_summary(fin_data, report.ai_summary, report_id)
    
    # Add titles
    title = f"Report: {report.company_name or 'Company'}"
    if report.report_year:
        title += f" ({report.report_year})"
        
    # Send
    res = whatsapp_service.send_whatsapp_summary(
        phone_number=request.phone_number,
        message=f"*FinSight AI*\n{title}\n\n{msg_body}"
    )
    
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Unknown error"))
        
    return {"status": "success", "message": "WhatsApp sent", "sid": res.get("message_sid")}
@router.get("/{report_id}/news")
def get_report_news(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = crud_annual_report.get_annual_report(db, report_id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Use ticker if available, otherwise just company name
    f_data = {}
    if report.financial_data_json:
        try: f_data = json.loads(report.financial_data_json)
        except: pass
    
    ticker = f_data.get("ticker", "")
    news = ai_service.get_and_summarize_news(report.company_name, ticker)
    return news


@router.post("/{report_id}/auto-detect-ticker")
def auto_detect_ticker(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = crud_annual_report.get_annual_report(db, report_id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    result = ai_service.detect_ticker(report.company_name)
    
    if result.get("ticker"):
        import json
        try:
            current_data = json.loads(report.financial_data_json) if report.financial_data_json else {}
        except:
            current_data = {}
            
        current_data["ticker"] = result["ticker"]
        current_data["exchange"] = result.get("exchange", "NSE")
        current_data["sector"] = result.get("sector", "N/A")
        
        report.financial_data_json = json.dumps(current_data)
        db.commit()
        db.refresh(report)
        
    return result


@router.get("/{report_id}/live-ltp")
def get_live_ltp(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = crud_annual_report.get_annual_report(db, report_id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    import json
    try:
        data = json.loads(report.financial_data_json) if report.financial_data_json else {}
    except:
        data = {}
        
    ticker = data.get("ticker")
    exchange = data.get("exchange", "NSE")
    
    if not ticker:
        return {"error": "No ticker set"}
        
    from app.services import stock_service
    price_data = stock_service.get_live_price(ticker, exchange)
    return price_data


@router.post("/{report_id}/reanalyze")
async def reanalyze_report(
    report_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Re-trigger AI analysis for an existing report. Useful for fixing N/A data."""
    report = crud_annual_report.get_annual_report(db, report_id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check if the original PDF still exists
    file_path = Path("uploads") / f"report_{report.id}.pdf"
    if not file_path.exists():
        raise HTTPException(status_code=400, detail="Original PDF file not found on server. Please re-upload.")
    
    # Reset status to trigger re-analysis
    report.status = "pending"
    report.error_message = None
    db.commit()
    
    background_tasks.add_task(process_report_background, report.id, current_user.id, str(file_path))
    
    return {"status": "reanalyzing", "message": "Analysis restarted. Please wait and refresh the page."}
