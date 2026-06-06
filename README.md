# FinSight AI: Advanced Financial Intelligence Engine

[![CI/CD Pipeline](https://github.com/debjitghosal/finsight-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/debjitghosal/finsight-ai/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen.svg)](https://finsight-ai-smoky.vercel.app/)

**FinSight AI** is a production-grade financial report analyzer that converts complex, multi-hundred-page Annual Reports (PDFs) into structured, institutional-quality investment data. It leverages a hybrid AI architecture using **Google Gemini 1.5 + Groq** for high-speed, parallelized data extraction and zero-hallucination document Q&A.

🌐 **Live Application:** https://finsight-ai-smoky.vercel.app/

---

## 🚀 Key Features

- **Hybrid AI Architecture**: Seamlessly uses **Google Gemini 1.5 Flash** for deep document analysis and **Groq Llama 3** as a rapid fallback engine when quotas are reached or faster responses are needed.
- **Large PDF Deep Scan**: Designed to support large financial reports and complex PDFs up to **1000 pages**, scanning content across the complete document.
- **Multi-Report Comparison**: Compare multiple financial reports side-by-side, supporting up to **10 reports** for cross-period, cross-company, and trend-based analysis.
- **Blazing-Fast Parallel Extraction**: Uses a multi-stage extraction pipeline to process Profit & Loss, Balance Sheet, risks, highlights, summaries, and financial metrics efficiently.
- **Boss AI / Global Portfolio Brain**: A higher-level AI assistant that can reason across uploaded reports and support cross-company or multi-report comparison.
- **Streaming Chatbot Interface**: Real-time, word-by-word streaming responses using **Server-Sent Events (SSE)** for a smooth interactive research experience.
- **Voice-Powered Financial Research**: Supports speech-based interaction using speech-to-text capabilities, allowing users to query reports hands-free.
- **Zero-Hallucination Q&A**: A document-bound Q&A system designed to answer only from uploaded report context and avoid unsupported claims.
- **Investor-Focused Analysis**: Generates simplified insights, financial risks, key metrics, and investment-oriented summaries for decision-making.
- **Professional PDF Export**: Exports a PDF report containing key metrics, insights, summaries, and visual analysis.
- **Financial Visualizations**: Generates charts and dashboards for revenue, profit, assets, liabilities, debt, and other important financial indicators.
- **WhatsApp Sharing Support**: Allows simplified summaries and reports to be shared through WhatsApp integration.
- **Authentication & Persistence**: Includes user authentication, JWT-based security, and persistent report storage using PostgreSQL.
- **Cloud & CI/CD Ready**: Built with deployed frontend/backend services, Google Cloud services, CI/CD workflows, and scalable infrastructure.

---

## 🏗️ Architecture & Data Flow

```mermaid
graph TD
    Visitor((Visitor)) -->|Landing Page| UI[React Frontend]
    UI -->|Login / Register| Auth[Authentication Layer]
    Auth -->|Dashboard Access| Console[Financial Command Center]

    Console -->|Upload PDF Reports| API[FastAPI Backend]
    API -->|Async Processing| PDF[pypdfium2 / pdfplumber / PyPDF2 Engine]
    PDF -->|Extract Text, Tables & Financial Data| Text[Full Document Context]

    subgraph Hybrid_AI_Analysis
        Text --> Gemini[Google Gemini 1.5 Flash]
        Gemini -->|Fallback / Speed Layer| Groq[Groq Llama 3]
        Groq --> AIOut[AI Analysis Output]
        Gemini --> AIOut
    end

    subgraph Parallel_Extractors
        AIOut --> PnL[Profit & Loss Extraction]
        AIOut --> BS[Balance Sheet Extraction]
        AIOut --> Risk[Risk & Highlights Extraction]
        AIOut --> Summary[Executive Summary]
        AIOut --> Metrics[Financial Metrics]
    end

    PnL --> Merge[Synthesis Engine]
    BS --> Merge
    Risk --> Merge
    Summary --> Merge
    Metrics --> Merge

    Merge --> Insights[Investment Insights & Visual Analysis]
    Insights --> DB[(PostgreSQL / Neon)]

    DB -->|Display Results| Console
    Console -->|Ask Questions| Chat[Streaming AI Chatbot]
    Chat -->|Report Context| BossAI[Boss AI Assistant]

    Console -->|Export| PDFReport[PDF Report]
    Console -->|Share| WhatsApp[WhatsApp Summary]
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, TypeScript | Fast, modern, scalable user interface |
| **Routing** | React Router DOM | Multi-page dashboard and navigation |
| **Styling** | Tailwind CSS, Vanilla CSS | Responsive glassmorphism UI and professional layout |
| **Animations** | Framer Motion | Smooth page transitions and interactive effects |
| **Charts & Icons** | Recharts, Lucide React | Financial dashboards and clean iconography |
| **Backend** | FastAPI, Python, Uvicorn | High-performance asynchronous backend |
| **Database** | PostgreSQL on Neon.tech | Cloud database for users, reports, and analysis records |
| **ORM** | SQLAlchemy | Structured database access and models |
| **AI Models** | Google Gemini 1.5 Flash, Groq Llama 3 | Financial analysis, Q&A, summarization, and fallback intelligence |
| **PDF Processing** | pypdfium2, pdfplumber, PyPDF2 | Text, table, and document extraction |
| **Real-Time Chat** | Server-Sent Events | Streaming chatbot responses |
| **Authentication** | Google OAuth, JWT, passlib, bcrypt | Secure login and protected user sessions |
| **Financial Data** | yfinance | Market and ticker-based financial enrichment |
| **Reports** | FPDF2, OpenPyXL | PDF reports and structured report generation |
| **Communication** | Twilio | WhatsApp messaging support |
| **Speech & Audio** | Google Cloud Speech, Google Cloud Text-to-Speech | Voice-based queries and audio capabilities |
| **Cloud Services** | Google Cloud services | Scalable cloud support and AI infrastructure |
| **CI/CD** | GitHub Actions | Automated checks and deployment workflow |

---

## ⚙️ Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/debjitghosal/finsight-ai.git
cd finsight-ai
```

---

### 2. Backend Setup

```bash
cd backend
python -m venv venv
```

For Windows:

```bash
venv\Scripts\activate
```

For macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

### 3. Configuration

Create a `.env` file inside the `backend/` directory:

```env
# AI API Keys
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key

# Optional: Multiple Gemini keys for rotation
GEMINI_API_KEYS=key1,key2,key3

# Database
DATABASE_URL=postgresql://user:password@host/dbname

# Authentication
JWT_SECRET_KEY=your_jwt_secret
JWT_ALGORITHM=HS256

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Twilio / WhatsApp
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=your_twilio_whatsapp_number

# Optional App Config
ENVIRONMENT=development
```

---

### 4. Run Backend

```bash
uvicorn main:app --reload
```

Backend will usually run at:

```text
http://127.0.0.1:8000
```

---

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

🎥 **Demo Video:** https://drive.google.com/file/d/1L9e7fAIYI9PKNlsZhN6XKzCJGulYgR5G/view?usp=sharing

Frontend will usually run at:

```text
http://localhost:5173
```

---

## 🤖 CI/CD Workflow

The project includes a GitHub Actions workflow for automated quality checks and deployment readiness.

- **Backend Checks**: Python dependency validation, linting, and API structure checks.
- **Frontend Checks**: Build verification, TypeScript validation, and frontend dependency checks.
- **Workflow Badge**: The CI/CD status badge is displayed at the top of this README.
- **Deployment Readiness**: Designed for cloud deployment with separate frontend and backend services.

---

## 🛡️ Data Integrity & Reliability

FinSight AI is designed to reduce hallucinations and improve financial reliability through:

- **Document-bound AI responses** based on uploaded report content.
- **Strict extraction prompts** that return empty values when data is unavailable instead of fabricating metrics.
- **Large context indexing** for deep report scanning and long-document analysis.
- **Hybrid model fallback** to improve uptime and response reliability.
- **Database-backed persistence** for storing structured summaries, reports, and analysis outputs.
- **Encrypted communication and authentication layers** for secure user access.

---

## 📊 What FinSight AI Can Analyze

FinSight AI can work with:

- Annual reports
- Corporate filings
- Balance sheets
- Profit & loss statements
- Cash flow statements
- Order reports
- Investor presentations
- Financial PDFs
- Multi-period company reports
- Cross-company comparison documents

---

## 💡 Example Questions Users Can Ask

- Is this company good for investment?
- What are the major financial risks in this report?
- Compare revenue growth across these reports.
- Is debt increasing faster than profit?
- What are the key highlights from the balance sheet?
- Summarize this annual report in simple language.
- What are the red flags investors should notice?
- Compare assets, liabilities, revenue, and profit across uploaded reports.
- Which company looks financially stronger based on the uploaded reports?
- What are the most important financial ratios from this report?

---

## 📌 Project Purpose

Financial documents are often long, complex, and difficult to interpret quickly. FinSight AI aims to make financial intelligence more accessible by converting dense reports into simplified summaries, visual insights, investor-focused analysis, and interactive AI-powered Q&A.

The platform is built for:

- Retail investors
- Students
- Analysts
- Founders
- Finance professionals
- Investment researchers
- FinTech teams
- Data-driven decision makers

---

## 🔮 Future Enhancements

- Improved ratio extraction and financial metric validation
- More advanced multi-company benchmarking
- Stronger market and ticker-based enrichment
- Better PDF report styling and export templates
- Advanced portfolio-level insights
- More robust WhatsApp report delivery
- Admin analytics dashboard
- Role-based access for institutional users

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

**Debjit Ghosal**

🌐 **Live Project:** https://finsight-ai-smoky.vercel.app/  
🎥 **Demo Video:** https://drive.google.com/file/d/1L9e7fAIYI9PKNlsZhN6XKzCJGulYgR5G/view?usp=sharing  

---
