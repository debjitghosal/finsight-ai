"""
AI Service — Gemini 1.5 Pro powered financial analysis engine.
"""
from __future__ import annotations
import json
import re
import urllib.parse
from typing import Optional
from google import genai
from app.core.config import settings

import random
import threading
import time
from google.genai import types

try:
    from groq import Groq
except ImportError:
    Groq = None

_MODEL_NAME = "gemini-2.0-flash"
_active_keys = []
_invalid_keys = set()
_key_lock = threading.Lock()

def get_keys():
    global _active_keys
    with _key_lock:
        if not _active_keys:
            raw_keys = settings.GEMINI_API_KEYS or settings.GEMINI_API_KEY
            if raw_keys:
                _active_keys = [k.strip() for k in str(raw_keys).split(",") if k.strip()]
            if not _active_keys:
                raise RuntimeError("No Gemini API keys found in Configuration.")
        return [k for k in _active_keys if k not in _invalid_keys]

def _safe_generate(prompt: str, max_retries: int = 3) -> str:
    from google.genai.errors import ClientError
    
    available_keys = get_keys()
    if not available_keys:
        print("CRITICAL: All Gemini API keys are marked as invalid!")
        return ""

    # SHUFFLE keys for load balancing across parallel threads
    keys_to_try = list(available_keys)
    random.shuffle(keys_to_try)

    # Try each available key
    for key in keys_to_try:
        # For each key, we try a few times, but if we hit a RATE LIMIT, 
        # we rotate keys IMMEDIATELY instead of sleeping.
        for attempt in range(max_retries + 1):
            try:
                client = genai.Client(api_key=key)
                response = client.models.generate_content(
                    model=_MODEL_NAME,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        safety_settings=[
                            types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
                            types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=types.HarmBlockThreshold.BLOCK_NONE),
                            types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
                            types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
                        ]
                    )
                )

                if not response or not hasattr(response, 'text'):
                     return ""
                
                return str(response.text or "").strip()

            except Exception as e:
                err_str = str(e).lower()
                
                # Invalid Key: Blacklist and move to next key
                if any(x in err_str for x in ["api_key_invalid", "api key not valid", "not authorized"]):
                    print(f"WARNING: Key [{key[:8]}...] INVALID. Blacklisting and rotating...")
                    _invalid_keys.add(key)
                    break 
                
                # Blocked: Fail fast
                if "safety" in err_str or "blocked" in err_str:
                    print(f"CRITICAL: Gemini output BLOCKED. Error: {err_str}")
                    return ""
                    
                # Rate Limit (429) or Server Error (500/502/503): Rotate key IMMEDIATELY
                if any(x in err_str for x in ["429", "quota", "exhausted", "500", "502", "503", "unavailable"]):
                    print(f"SERVICE ERROR/LIMIT on [{key[:8]}...]. Rotating key immediately...")
                    break # Break attempt loop, try next key in keys_to_try
                    
                if attempt == max_retries:
                    print(f"Failed after max retries on key [{key[:8]}...]: {err_str}")
                    break # Try next key
    
    # If we exhausted ALL keys and still haven't returned, sleep briefly as a last resort
    print("ALL KEYS EXHAUSTED. Cooling down 10s...")
    time.sleep(10)
    return ""

def _fast_generate(prompt: str) -> str:
    """Uses Groq's super-fast Llama-3 for generating content if available, falling back to Gemini."""
    if Groq and settings.GROQ_API_KEY:
        try:
            client = Groq(api_key=settings.GROQ_API_KEY)
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": "You are a senior financial analyst."},
                          {"role": "user", "content": prompt}]
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Groq API failed, falling back to Gemini... Error: {e}")
            return _safe_generate(prompt)
    else:
        return _safe_generate(prompt)

def _safe_generate_stream(prompt: str):
    """Fallback generator using Gemini stream with exhaustive key rotation."""
    available_keys = get_keys()
    has_yielded_any = False
    
    for key in available_keys:
        try:
            client = genai.Client(api_key=key)
            response = client.models.generate_content_stream(
                model=_MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    safety_settings=[
                        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
                        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=types.HarmBlockThreshold.BLOCK_NONE),
                        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
                        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
                    ]
                )
            )
            for chunk in response:
                text = getattr(chunk, 'text', None)
                if text:
                     has_yielded_any = True
                     yield text
            
            # If we successfully yielded content, we are done
            if has_yielded_any:
                return

        except Exception as e:
            err_str = str(e).lower()
            # If we hit an invalid key, rate limit, OR a server error, ROTATE and try next key
            if any(x in err_str for x in ["api_key_invalid", "not authorized", "429", "quota", "exhausted", "500", "502", "503", "unavailable"]):
                if any(x in err_str for x in ["api_key_invalid", "not authorized"]):
                    print(f"WARNING: Gemini Stream Key [{key[:8]}...] is INVALID. Blacklisting...")
                    _invalid_keys.add(key)
                continue # Try next key in pool
            
            # If we already yielded some content, don't restart (messy UX)
            if has_yielded_any:
                yield f"\n\n[FinSight Protocol Notice: Connection truncated during generation.]"
                return
    
    # Final Fallback if loop finishes with nothing yielded
    if not has_yielded_any:
        yield "The FinSight Intelligence Engine is currently experiencing high demand across all API nodes. Please try your request again in a few moments or simplify your query."
def _fast_generate_stream(prompt: str):
    """Uses Groq's super-fast Llama-3 stream, cascades to Gemini pool if Groq fails or stays silent."""
    has_yielded_from_groq = False
    if Groq and settings.GROQ_API_KEY:
        try:
            client = Groq(api_key=settings.GROQ_API_KEY, timeout=10.0)
            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": "You are an elite financial OS and chatbot. Output formatted markdown."},
                          {"role": "user", "content": prompt}],
                stream=True
            )
            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    has_yielded_from_groq = True
                    yield content
            
            if has_yielded_from_groq:
                return # Groq was successful
                
        except Exception as e:
            print(f"Groq API Stream failed: {e}. Cascading to Gemini pool...")

    # If Groq failed OR stayed silent, cascade to Gemini pool
    if not has_yielded_from_groq:
        yield from _safe_generate_stream(prompt)


PNL_EXTRACTION_PROMPT = """
You are a senior financial analyst. Read the text below and extract the Profit & Loss figures.
CRITICAL: Replace each field with REAL extracted values including currency and scale. NEVER output 'string' or placeholder text.
If a value is not present, use JSON null.
Output ONLY valid JSON:
{{
  "revenue": "<e.g. Rs. 3,552 Crore>",
  "net_profit": "<e.g. Rs. 351 Crore or loss of Rs. 123 Crore>",
  "gross_profit": "<actual gross profit>",
  "ebitda": "<actual EBITDA>",
  "eps": "<e.g. Rs. 2.50 per share>",
  "revenue_growth": "<e.g. 35.2% YoY>",
  "profit_margin": "<e.g. 9.8%>"
}}
Text: {text}
"""

BALANCE_SHEET_PROMPT = """
You are a senior financial analyst. Read the text and extract Balance Sheet figures.
CRITICAL: Replace each field with REAL extracted values including currency and scale. NEVER output 'string' or placeholder text.
If a value is not present, use JSON null.
Output ONLY valid JSON:
{{
  "total_assets": "<actual total assets with currency>",
  "total_liabilities": "<actual total liabilities>",
  "equity": "<actual shareholders equity>",
  "debt_to_equity": "<actual D/E ratio>",
  "current_ratio": "<actual current ratio>",
  "return_on_equity": "<actual ROE %>",
  "return_on_assets": "<actual ROA %>"
}}
Text: {text}
"""

HIGHLIGHTS_PROMPT = """
You are a senior financial analyst. Read the text and extract company highlights and risks.
CRITICAL: Replace each field with REAL extracted values. NEVER output 'string' or placeholder text.
If a value is not present, use JSON null.
Output ONLY valid JSON:
{{
  "company_name": "<exact legal company name>",
  "fiscal_year": "<e.g. 2024-25>",
  "key_business_segments": ["<segment 1>", "<segment 2>", "<segment 3>"],
  "major_risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "key_highlights": ["<highlight 1>", "<highlight 2>", "<highlight 3>"],
  "operating_cash_flow": "<actual operating cash flow with currency>"
}}
Text: {text}
"""

FINANCIAL_PIPELINE_PROMPT = """
You are a senior hedge fund analyst. Your task is to READ the Annual Report text below and EXTRACT real financial data.

CRITICAL RULES — READ CAREFULLY:
1. You MUST replace every field with an ACTUAL VALUE found in the document.
2. NEVER output placeholder words like "string", "null", "N/A", "unknown", or any description.
3. If a specific value is truly not present in the text, set that field to JSON null (not the word "null").
4. Include currency and scale with every monetary value (e.g., "Rs. 17,942 Crore", "$4.2 Billion", "12.5%").
5. For stock_ticker: find the actual NSE/BSE/NASDAQ symbol. Add .NS suffix for NSE, .BO for BSE.
6. If this is a Zomato/Blinkit report, the listed entity is ETERNAL LIMITED (ticker: ETERNAL.NS on NSE).
7. Output ONLY valid JSON. No explanation, no markdown, no code fences.

Output this exact JSON structure with REAL extracted values:
{{
  "pnl": {{
    "revenue": "<actual revenue figure with currency and scale>",
    "net_profit": "<actual net profit/loss figure>",
    "gross_profit": "<actual gross profit figure>",
    "ebitda": "<actual EBITDA figure>",
    "eps": "<actual earnings per share>",
    "revenue_growth": "<actual YoY growth percentage>",
    "profit_margin": "<actual net margin percentage>"
  }},
  "balance_sheet": {{
    "total_assets": "<actual total assets>",
    "total_liabilities": "<actual total liabilities>",
    "equity": "<actual shareholders equity>",
    "debt_to_equity": "<actual ratio>",
    "current_ratio": "<actual ratio>",
    "return_on_equity": "<actual ROE percentage>",
    "return_on_assets": "<actual ROA percentage>"
  }},
  "metadata": {{
    "company_name": "<exact legal company name>",
    "fiscal_year": "<fiscal year e.g. 2024-25>",
    "stock_ticker": "<exchange symbol e.g. SWIGGY.NS>",
    "primary_exchange": "<NSE or BSE or NASDAQ or NYSE>",
    "key_business_segments": ["<segment 1>", "<segment 2>", "<segment 3>"],
    "major_risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
    "key_highlights": ["<highlight 1>", "<highlight 2>", "<highlight 3>"],
    "operating_cash_flow": "<actual operating cash flow figure>"
  }}
}}

Annual Report Text:
{text}
"""

def extract_pnl_data(text: str) -> dict:
    raw = _safe_generate(PNL_EXTRACTION_PROMPT.format(text=str(text or "")[:800000]))
    try: 
        match = re.search(r'\{.*\}', str(raw), re.DOTALL)
        return json.loads(match.group(0)) if match else {}
    except: return {}

def extract_balance_sheet_data(text: str) -> dict:
    raw = _safe_generate(BALANCE_SHEET_PROMPT.format(text=str(text or "")[:800000]))
    try:
        match = re.search(r'\{.*\}', str(raw), re.DOTALL)
        return json.loads(match.group(0)) if match else {}
    except: return {}

def extract_highlights_data(text: str) -> dict:
    raw = _safe_generate(HIGHLIGHTS_PROMPT.format(text=str(text or "")[:800000]))
    try:
        match = re.search(r'\{.*\}', str(raw), re.DOTALL)
        return json.loads(match.group(0)) if match else {}
    except: return {}

def extract_financial_pipeline(text: str) -> dict:
    """Consolidated Pipeline: Extract PnL, BS, and Highlights in one hit."""
    raw = _safe_generate(FINANCIAL_PIPELINE_PROMPT.format(text=str(text or "")[:950000]))
    try:
        match = re.search(r'\{.*\}', str(raw), re.DOTALL)
        if not match:
            print("WARNING: Pipeline returned no JSON match, falling back to separate calls...")
            return _fallback_pipeline(text)
        data = json.loads(match.group(0))
        
        # If top-level keys are missing or data is clearly garbage, fallback
        if not data.get("pnl") and not data.get("balance_sheet") and not data.get("metadata"):
            # Maybe AI returned flat JSON instead of nested
            if data.get("revenue") or data.get("company_name"):
                # Already flat, just use it directly
                return _normalize_pipeline_result(data)
            print("WARNING: Pipeline JSON missing expected keys, falling back...")
            return _fallback_pipeline(text)
        
        res = {
            **(data.get("pnl") or {}),
            **(data.get("balance_sheet") or {}),
            **(data.get("metadata") or {}),
            "ticker": data.get("metadata", {}).get("stock_ticker"),
            "exchange": data.get("metadata", {}).get("primary_exchange")
        }
        return _normalize_pipeline_result(res)
    except Exception as e:
        print(f"WARNING: Pipeline JSON parse error: {e}, falling back...")
        return _fallback_pipeline(text)

def _normalize_pipeline_result(res: dict) -> dict:
    """Post-process result: apply Zomato->Eternal rebranding, clean up N/A strings."""
    # Smart Ticker Mapping for Zomato -> Eternal Rebranding
    c_name = str(res.get("company_name", "")).lower()
    if "zomato" in c_name or "blinkit" in c_name or "eternal" in c_name:
        res["ticker"] = "ETERNAL.NS"
        res["exchange"] = "NSE"
        if not res.get("company_name") or "zomato" in str(res["company_name"]).lower():
            res["company_name"] = "Eternal Limited (Zomato)"
    
    # Strip placeholder 'string' values from the AI (it literally echoes the schema description)
    for k, v in list(res.items()):
        if str(v).strip().lower() in ["string", "null", "none", "", "n/a"]:
            res[k] = None
    
    return res

def _fallback_pipeline(text: str) -> dict:
    """Sequential fallback: run PnL, Balance Sheet, and Highlights separately."""
    print("INFO: Running fallback pipeline (separate calls)...")
    pnl = extract_pnl_data(text)
    bs = extract_balance_sheet_data(text)
    high = extract_highlights_data(text)
    combined = {**pnl, **bs, **high}
    return _normalize_pipeline_result(combined)

def extract_financial_data(text: str) -> dict:
    # Legacy wrapper if needed, but we typically use parallel now
    pnl = extract_pnl_data(text)
    bs = extract_balance_sheet_data(text)
    high = extract_highlights_data(text)
    return {**pnl, **bs, **high}

def extract_metadata(text: str, filename: str = "", pdf_title: str = "", pdf_author: str = "") -> dict:
    prompt = f"""
You are an elite corporate intelligence OS.
Cross-reference the following three distinct data streams to discover the true Company Name and Financial Year.

--- STREAM 1: PHYSICAL FILENAME ---
{filename}

--- STREAM 2: HIDDEN PDF METADATA ---
Title: {pdf_title}
Author: {pdf_author}

--- STREAM 3: RAW TEXT TRANSLATION ---
{text}

YOUR TARGETS:
1. `company_name`: Find the explicit, legal Registered Name. If the raw text is unreadable/garbage, aggressively use STREAM 1 (Filename) and STREAM 2 (Metadata) to deduce the company name.
2. `report_year`: Find the exact fiscal/financial year (e.g., "2023-2024", "2024-25", or "2024").

Identify the exact Stock Ticker (Symbol) and the Primary Exchange. 
Search for markers like "NSE:", "BSE:", "Symbol:", "Ticker:", or common indices. 
Look for ISIN or Industry Sector as well.
JSON Format:
{{
    "company_name": "Extracted Name Here",
    "report_year": "Extracted Year Here",
    "ticker": "Symbol Here (e.g. TCS, RELIANCE, AAPL)",
    "exchange": "NSE, BSE, NASDAQ, or NYSE",
    "sector": "e.g. Information Technology"
}}
"""
    res = _safe_generate(prompt)
    try:
        # Find the first valid JSON block
        match = re.search(r'\{.*\}', res, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(res.strip())
    except:
        return {"company_name": "", "report_year": "", "ticker": "", "exchange": ""}

SUMMARY_PROMPT = """Write a detailed executive summary based strictly on the provided text. Focus on business performance, segment growth, and risks. Text: {text}"""

def summarize_report(text: str) -> str:
    txt = str(text or "")[:800000]
    return _safe_generate(SUMMARY_PROMPT.format(text=txt))

QA_PROMPT = """You are a senior institutional financial analyst and chatbot. 
Analyze the provided document context to answer the user's question with high precision.

If the user asks for a recommendation (e.g., 'Should I buy?', 'Is this a good investment?'), follow this structure:
1. **Financial Verdict**: Synthesize the key metrics (Revenue, Profit, EBITDA) into a clear outlook.
2. **Investment Thesis**: Provide 2-3 data-driven reasons supporting the outlook.
3. **Institutional Risks**: Highlight critical headwinds found in the report.
4. **Conclusion**: Give a weighted summary.

**MANDATORY DISCLAIMER**: Always include at the end: "*FinSight AI provides data-driven analysis for informational purposes only. Consult a certified financial advisor before making investment decisions.*"

Document Content: {text}
Question: {question}"""

def answer_question(text: str, question: str) -> str:
    txt = str(text or "")[:800000]
    return _fast_generate(QA_PROMPT.format(text=txt, question=question))

MULTI_QA_PROMPT = """You are answering a question based strictly on the following context from multiple reports.
If the answer is not contained within the provided text, say so. DO NOT use outside knowledge.
Context: 
{context}

Question: {question}"""

def multi_answer_question(reports_context_list: list[str], labels: list[str], question: str) -> str:
    combined = ""
    for i in range(len(reports_context_list)):
        chunk = reports_context_list[i] or ""
        combined += f"\n--- {labels[i]} ---\n{chunk}\n"
    return _fast_generate(MULTI_QA_PROMPT.format(context=combined, question=question))

def multi_answer_question_stream(reports_context_list: list[str], labels: list[str], question: str):
    combined = ""
    for i in range(len(reports_context_list)):
        chunk = reports_context_list[i] or ""
        combined += f"\n--- {labels[i]} ---\n{chunk}\n"
    yield from _fast_generate_stream(MULTI_QA_PROMPT.format(context=combined, question=question))

GLOBAL_QA_PROMPT = """You are Fortuna, the angelic and divine master financial chatbot representing the user's dashboard on FinSight.ai. 
You possess vast knowledge of the internet and web. You should prioritize answering based on the provided account data context first. 
However, you MAY use your extensive general web knowledge if the request is broader or requires external context (e.g., general economic questions, global events).

--- FINSIGHT.AI PLATFORM TRAINING & FAQ (USE IF ASKED ABOUT THE APP) ---
If the user asks how to use this platform, reference the following Question & Answer definitions to guide them in a warm, divine, and helpful tone:

Q: How do I upload a new report to the platform?
A: You can bless our system with a new report by clicking the 'Upload Report' button in the top navigation bar, or 'New Analysis' on your Dashboard. Select any PDF annual report (up to ~500 pages) and our AI engines will process it into structured intelligence.

Q: How can I compare the performance of multiple companies?
A: To unveil comparative insights, navigate to the 'Compare' tab. There, you can select between 2 to 10 processed reports. I will instantly synthesize side-by-side financial trend charts and a cohesive text comparison for you.

Q: Where can I view visual analytics and revenue trends?
A: Navigate to the 'Analytics' tab. Here, you can select multiple companies to view beautiful, aggregate bar charts that visualize Revenue, Net Profit, and EBITDA trends side-by-side.

Q: Can I share these insights or export them offline?
A: Absolutely. From any individual Report page, you may click 'Export PDF' to download a clean, formatted offline copy. Alternatively, click 'WhatsApp' to send a swift, bulleted summary directly to your mobile device.

Q: How do I change a company's name or delete a report?
A: On your Dashboard command center, simply hover over any report card. Click the Pencil icon to edit the Company Name or Financial Year, or the Trash icon to permanently purge it from your records.

IMPORTANT FORMATTING RULES:
1. DO NOT use asterisks or hashes to make text bold or headers. Use plain text, capital letters for emphasis, or standard dash bullet points (-).
2. When listing the reports/companies you have access to, DO NOT use individual bullet points for every year. Group them together.
   Correct Format Example: Eternal Limited (2022-23, 2023-24, 2024-25)
   Do NOT output: "Zomato Limited (now known as Eternal Limited)" - just use the single provided name.

Context from User's Account (Done reports):
{context}

Question: {question}"""

def global_answer_question_stream(reports_context_list: list[str], labels: list[str], question: str):
    combined = ""
    for i in range(len(reports_context_list)):
        chunk = reports_context_list[i] or ""
        combined += f"\n--- {labels[i]} ---\n{chunk}\n"
    prompt = GLOBAL_QA_PROMPT.format(count=len(reports_context_list), context=combined, question=question)
    yield from _fast_generate_stream(prompt)

COMPARE_PROMPT = """Compare Report 1: {text1} vs Report 2: {text2}
IMPORTANT FORMATTING RULES:
- DO NOT use markdown tables (no '|' characters).
- Format the comparison strictly as a bulleted list.
- Each metric MUST start on a new line with a bullet point and be bolded.
Example:
* **Revenue**: Report 1 value vs Report 2 value - Insights here.
* **Net Profit**: ...
"""

def compare_reports(text1: str, text2: str, label1: str="Report 1", label2: str="Report 2") -> str:
    t1 = str(text1 or "")
    t2 = str(text2 or "")
    return _fast_generate(COMPARE_PROMPT.format(text1=t1, text2=t2))

MULTI_COMPARE_PROMPT = """You are a senior financial analyst comparing multiple annual reports.
Based on the following data for multiple reports, provide a cohesive, analytical comparison of their financial performance, trends, and market positioning. 
Focus on Revenue, Net Profit, Growth, and Key Highlights.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown tables (no '|' characters).
- Format the comparison strictly as a bulleted list.
- Compare the metrics across companies on a single line where possible.
Example:
* **Revenue**: Company A (Value) outpaced Company B (Value) significantly...

Data:
{reports_text}
"""

def multi_compare_reports(reports_data: list[str], labels: list[str]) -> str:
    combined = ""
    for i in range(len(reports_data)):
        chunk = reports_data[i] or ""
        combined += f"\n--- {labels[i]} ---\n{chunk}\n"
    return _fast_generate(MULTI_COMPARE_PROMPT.format(reports_text=combined))

INVESTMENT_PROMPT = """You are a top-tier institutional investment advisor. 
Analyze the following financial data and executive summary to provide a detailed investment insight.
Categorize as 'Buy', 'Hold', or 'Avoid' and provide a 2-3 paragraph justification focusing on valuation, growth prospects, and risk factors.

Financial Data: {financial_json}
Executive Summary: {summary}

Insight:"""

def generate_investment_insight(financial_data: dict, summary: str) -> str:
    s = str(summary or "")
    return _fast_generate(INVESTMENT_PROMPT.format(financial_json=json.dumps(financial_data), summary=s))

def generate_whatsapp_summary(financial_data: dict, summary: str, report_id: int) -> str:
    """Fulfills WhatsApp summary requests with a direct link and high-impact formatting."""
    data_ctx = json.dumps(financial_data, indent=2)
    # Construct a back-link for the mobile user
    backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000")
    url = f"{backend_url}/reports/{report_id}"
    res = _fast_generate(WHATSAPP_PROMPT.format(data=data_ctx, summary=summary or "", report_url=url))
    # Ensure it's not empty, fallback to raw summary snippet if AI fails
    if not res:
        return (summary or "Market Report Analyst: Financial summaries are currently being processed.")[:800]
    return res

WHATSAPP_PROMPT = """You are a senior financial advisor.
Extract the provided data and synthesize a highly structured, professional WhatsApp message summarizing the Annual Report. 
CRITICAL RULE: Format strictly with bullet points, emojis, bold text (*text*), and short paragraphs. Add line breaks.
EXTREMELY IMPORTANT: The total length of the message MUST NOT exceed 950 characters to fit within legacy SMS/Twilio WhatsApp limits. Be very concise.

Template:
*📊 Financial Summary: [Company Name] FY[Year]*

*💰 Key Financials:*
• 💵 Revenue: [Revenue]
• 📈 Net Profit: [Profit]
• 🪙 EPS: [EPS]

*🚀 Strategic Insights:*
[1 Very short concise paragraph summarizing growth trajectory & business health]

*⚠️ Major Risks:*
• [Risk 1]
• [Risk 2]

*🔗 Full Report:* {report_url}

Data Context: {data}"""

BATCH_NEWS_SUMMARY_PROMPT = """
Analyze the following list of news articles for {company_name}. 
Provide a concise, professional summary for EACH article (approx 50-60 words each).
Focus on the financial and business impact.

Output format: Return ONLY a JSON list of strings, in the same order as provided.
[
  "Summary for article 1...",
  "Summary for article 2...",
  ...
]

Articles:
{text}
"""

def get_and_summarize_news(company_name: str, ticker: str = "") -> list[dict]:
    """
    Fetches latest news via Google News RSS and summarizes the top items in a single BATCH call.
    """
    import urllib.request
    import xml.etree.ElementTree as ET
    from datetime import datetime
    import email.utils
    
    query = f"{company_name} {ticker} stock news".strip()
    encoded_query = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            rss_data = response.read().decode('utf-8')
        
        root = ET.fromstring(rss_data)
        items = []
        
        for item in root.findall('.//item'):
            title = item.find('title').text
            link = item.find('link').text
            pub_date_str = item.find('pubDate').text
            description = item.find('description').text or ""
            
            try: dt = email.utils.parsedate_to_datetime(pub_date_str)
            except: dt = datetime.now()
            
            clean_desc = re.sub('<[^<]+?>', '', description)
            items.append({
                "title": title, "link": link, "date": pub_date_str,
                "timestamp": dt.timestamp(), "snippet": clean_desc
            })
            
        if not items: return []
            
        # Sort by latest and cap at 10 for better batch focus
        items.sort(key=lambda x: x['timestamp'], reverse=True)
        items = items[:10]
            
        # Prepare batch prompt
        batch_text = ""
        for i, entry in enumerate(items):
            batch_text += f"[{i+1}] {entry['title']}\n{entry['snippet']}\n\n"
        
        raw_res = _fast_generate(BATCH_NEWS_SUMMARY_PROMPT.format(company_name=company_name, text=batch_text))
        
        try:
            # Extract JSON list from response
            match = re.search(r'\[.*\]', raw_res, re.DOTALL)
            summaries = json.loads(match.group(0)) if match else []
        except:
            summaries = []
            
        final_items = []
        for i, entry in enumerate(items):
            summ = summaries[i] if i < len(summaries) else "Summary currently unavailable."
            final_items.append({**entry, "summary": summ})
            
        return final_items
    except Exception as e:
        print(f"News fetching error: {e}")
        return []

TICKER_DETECTION_PROMPT = """
Identify the most likely Stock Ticker Symbol, Primary Exchange, and Business Sector for the following company.
Company Name: {company_name}

For Indian companies listed on NSE, append .NS to the ticker symbol.
For Indian companies listed on BSE, append .BO to the ticker symbol.
Examples: Swiggy -> SWIGGY.NS, Reliance Industries -> RELIANCE.NS, Infosys -> INFY.NS
For US companies, just use the raw symbol: Apple -> AAPL, Google -> GOOGL

Return ONLY valid JSON with no markdown:
{{"ticker": "SYMBOL", "exchange": "NSE/BSE/NASDAQ/NYSE", "sector": "Technology/Finance/Consumer/etc"}}
"""

def detect_ticker(company_name: str) -> dict:
    """Detects stock ticker using yfinance first, then falls back to AI."""
    import yfinance as yf

    # Step 1: Try common NSE/BSE suffixes directly via yfinance
    clean = company_name.strip().upper().replace(" ", "").replace("LIMITED", "").replace("LTD", "").replace(".", "")
    candidates = [f"{clean}.NS", f"{clean}.BO"]
    
    for ticker_try in candidates:
        try:
            info = yf.Ticker(ticker_try).info
            if info and (info.get("regularMarketPrice") or info.get("currentPrice") or info.get("symbol")):
                exchange = "BSE" if ticker_try.endswith(".BO") else "NSE"
                return {
                    "ticker": ticker_try,
                    "exchange": exchange,
                    "sector": info.get("sector", "N/A")
                }
        except Exception:
            pass

    # Step 2: Fall back to AI for intelligent lookup
    res = _fast_generate(TICKER_DETECTION_PROMPT.format(company_name=company_name))
    try:
        match = re.search(r'\{.*\}', res, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            # Verify with yfinance if possible
            ticker = data.get("ticker", "")
            if ticker:
                try:
                    info = yf.Ticker(ticker).info
                    if info.get("sector"):
                        data["sector"] = info["sector"]
                except Exception:
                    pass
            return data
        return json.loads(res.strip())
    except Exception:
        return {"ticker": "", "exchange": "NSE", "sector": "N/A"}
