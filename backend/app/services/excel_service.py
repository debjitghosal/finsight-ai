import io
import openpyxl

def generate_excel_report(financial_data: dict, ai_summary: str, investment_insight: str, company_name: str=None, report_year: int=None) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Summary"
    ws["A1"] = f"{company_name or 'Company'} Summary"
    ws["A3"] = ai_summary
    
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
