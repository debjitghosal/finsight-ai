import markdown
from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, "FinSight AI Structured Analysis", border=0, align="R", new_x="LMARGIN", new_y="NEXT")

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

def clean_text(text: str) -> str:
    """Bulletproof sanitization for Latin-1 encoding (FPDF standard)."""
    if not text:
        return ""
    # Map common high-unicode financial symbols to readable Latin-1/ASCII
    replacements = {
        "₹": "INR ",
        "–": "-", "—": "-", # dashes
        "‘": "'", "’": "'", "“": '"', "”": '"', # smart quotes
        "•": "-", "●": "-", "▪": "-", "◦": "-", # bullets
        "✓": "Y", "✅": "Y", "×": "x", "…": "...", "→": "->", "←": "<-"
    }
    for char, rep in replacements.items():
        text = text.replace(char, rep)
    
    # Final safety: encode to latin-1 and ignore anything that can't be mapped
    # This ensures the PDF generator NEVER crashes due to an unknown symbol.
    return text.encode('latin-1', 'ignore').decode('latin-1')

def generate_pdf_report(
    financial_data: dict,
    ai_summary: str,
    investment_insight: str,
    company_name: str,
    report_year: str
) -> bytes:
    pdf = PDF()
    pdf.add_page()
    
    # Title
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(33, 37, 41)
    
    # Remove unicode breaking chars
    safe_company = clean_text(company_name or "Annual Report")
    safe_year = clean_text(report_year or "")
    
    pdf.cell(0, 15, f"{safe_company} - FY {safe_year}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(5)
    
    # Financial Metrics Table
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(79, 70, 229) # Indigo
    pdf.cell(0, 10, "Key Financial Metrics", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(0, 0, 0)
    
    metrics = [
        ("Revenue", financial_data.get("revenue", "N/A")),
        ("Net Profit", financial_data.get("net_profit", "N/A")),
        ("EBITDA", financial_data.get("ebitda", "N/A")),
        ("EPS", financial_data.get("eps", "N/A")),
        ("Growth", financial_data.get("revenue_growth", "N/A")),
        ("Current Ratio", financial_data.get("current_ratio", "N/A"))
    ]
    
    pdf.set_fill_color(243, 244, 246)
    for i, (k, v) in enumerate(metrics):
        if str(v).strip() and v != "N/A":
            clean_v = clean_text(str(v))
            fill = (i % 2 == 0)
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(45, 10, k, border=1, fill=fill)
            pdf.set_font("Helvetica", "", 11)
            pdf.cell(145, 10, clean_v, border=1, new_x="LMARGIN", new_y="NEXT", fill=fill)
            
    pdf.ln(10)
    
    # Executive Summary (Raw Text Parse to avoid FPDF HTML memory bugs)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(79, 70, 229)
    pdf.cell(0, 10, "Executive AI Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    
    summary_raw = clean_text(ai_summary)
    
    for line in summary_raw.split('\n'):
        clean_line = line.replace('**', '').strip()
        if not clean_line:
            pdf.ln(5)  # breathing room
            continue
            
        if clean_line.startswith('#'):
            clean_hdr = clean_line.replace('#', '').strip()
            pdf.set_font("Helvetica", "B", 12)
            pdf.multi_cell(0, 10, clean_hdr, new_x="LMARGIN", new_y="NEXT")
        elif clean_line.startswith('*') or clean_line.startswith('-'):
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 8, "  - " + clean_line[1:].strip(), new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 8, clean_line, new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(10)
    
    # Insights
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(79, 70, 229)
    pdf.cell(0, 10, "Institutional Insights", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    
    invest_raw = clean_text(investment_insight)
    
    for line in invest_raw.split('\n'):
        clean_line = line.replace('**', '').strip()
        if not clean_line:
            pdf.ln(5) 
            continue
            
        if clean_line.startswith('#'):
            clean_hdr = clean_line.replace('#', '').strip()
            pdf.set_font("Helvetica", "B", 12)
            pdf.multi_cell(0, 10, clean_hdr, new_x="LMARGIN", new_y="NEXT")
        elif clean_line.startswith('*') or clean_line.startswith('-'):
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 8, "  - " + clean_line[1:].strip(), new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 8, clean_line, new_x="LMARGIN", new_y="NEXT")
    
    # Return as raw bytes
    return bytes(pdf.output())
