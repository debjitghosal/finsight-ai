# FinSight AI: Advanced Financial Intelligence Engine

[![CI/CD Pipeline](https://img.shields.io/github/actions/workflow/status/debjitghosal/finsight-ai/ci.yml?branch=main&label=CI%2FCD&logo=github)](https://github.com/debjitghosal/finsight-ai/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen.svg)](https://finsight-ai-smoky.vercel.app/)

**FinSight AI** is a production-grade financial report analyzer that converts complex, multi-hundred-page Annual Reports (PDFs) into structured, institutional-quality investment data. It leverages a hybrid AI architecture (Google Gemini 1.5 + Groq) for high-speed, parallelized data extraction and zero-hallucination document Q&A.

---

## 🚀 Key Features

- **Hybrid AI Architecture**: Seamlessly toggles between **Google Gemini 1.5 Flash** for deep analysis and **Groq (Llama 3)** for ultra-fast, fail-safe fallback when quotas are reached.
- **Full-PDF Deep Scan**: No page limits. The engine scans 100% of the document—from the opening letter to the deep notes in the financial statements.
- **Blazing-Fast Parallel Extraction**: Utilizing a custom multi-threaded processing engine to perform specialized AI extractions (PnL, Balance Sheet, Risks, Summary) concurrently.
- **Boss AI (Global Portfolio Brain)**: A dedicated global AI agent that remembers context across all your uploaded reports, allowing for cross-company comparisons and trend analysis.
- **Streaming Chatbot Interface**: Real-time, word-by-word streaming responses (Server-Sent Events) for a seamless, interactive research experience.
- **Voice-Powered Financial Research**: Integrated **Speech-to-Text (Web Speech API)** allows users to query data hands-free. Perfect for quick institutional lookups.
- **Zero-Hallucination Q&A**: A document-bound system that utilizes the entire report context, strictly prohibited from using external knowledge to ensure cited accuracy.
- **Institutional Investment Advice**: Generates "Buy/Hold/Avoid" recommendations with multi-paragraph justifications based on real valuation metrics.
- **Professional Landing Experience**: A high-impact, glassmorphism-themed landing page designed for institutional users.

---

## 🏗️ Architecture & Data Flow

```mermaid
graph TD
    Visitor((Visitor)) -->|Landing Page| UI[React Frontend]
    UI -->|Login/Register| Auth[Auth Protocol]
    Auth -->|Dashboard| Console[Command Center]
    
    Console -->|Upload PDF| API[FastAPI Backend]
    API -->|Async Task| PDF[pypdfium2 Engine]
    PDF -->|Extract All Pages| Text[Full Document Text]
    
    subgraph Hybrid AI Analysis
        Text --> Gemini[Gemini 1.5 Flash]
        Gemini -->|Quota Limit| Groq[Groq Llama 3 Fallback]
    end
    
    subgraph Parallel Extractors
        Groq/Gemini --> PnL[PnL Extraction]
        Groq/Gemini --> BS[Balance Sheet Extraction]
        Groq/Gemini --> High[Highlights & Risks]
        Groq/Gemini --> Sum[Executive Summary]
    end
    
    PnL & BS & High & Sum --> Merge[Synthesis Engine]
    Merge --> Insights[Investment Insight Gen]
    Insights --> DB[(PostgreSQL / Neon)]
    
    DB -->|Stream Results| Console
    Console -->|Voice Query| Chat[Streaming Chatbot]
    Chat -->|Portfolio Context| BossAI[Boss AI Assistant]
```

---

## 🛠️ Technology Stack

### **Backend (Python)**
- **Framework**: FastAPI (High-performance API)
- **Database**: SQLAlchemy (ORM) with PostgreSQL (Neon.tech)
- **AI Core**: `google-genai` (Gemini 1.5) & `groq` (Llama 3 Fallback)
- **PDF Extraction**: `pypdfium2` / `pdfplumber`
- **Export Services**: `fpdf2` (PDF Reports) & `openpyxl` (Excel Models)

### **Frontend (React)**
- **Framework**: Vite + React
- **Styling**: Vanilla CSS + Tailwind (Modern Glassmorphism)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Data Fetching**: Axios + EventSource (Streaming)

---

## ⚙️ Setup & Installation

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### 2. Configuration (`.env`)
Create a `.env` file in the `backend/` directory:
```env
# AI API Keys
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key

# Database
DATABASE_URL=postgresql://user:pass@host/dbname

# Optional: Multiple Gemini keys for rotation
GEMINI_API_KEYS=key1,key2,key3
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🤖 CI/CD Workflow
The project includes a robust GitHub Actions pipeline that ensures code quality:
- **Linting**: Automated flake8 (Backend) and ESLint (Frontend) checks.
- **Testing**: Parallel execution of unit tests.
- **Type Checking**: Pydantic validation for all API schemas.

---

## 🛡️ Data Integrity
The engine includes a **Stabilized Context Window** logic:
- Up to **1,000,000 characters** of text are indexed per report.
- AI prompts are specifically designed to return `{}` if data is not found, preventing "imaginary" financial metrics.
- All communications are encrypted, supporting institutional-grade security protocols.
