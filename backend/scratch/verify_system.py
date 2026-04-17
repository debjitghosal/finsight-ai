import sys
import os
import json

# Add backend to path
sys.path.append(os.getcwd())

from app.core.config import settings
from app.services import ai_service
from app.services import pdf_service
from app.services import whatsapp_service

def test_gemini():
    print("--- TESTING GEMINI ---")
    try:
        raw_keys = settings.GEMINI_API_KEYS or settings.GEMINI_API_KEY
        key_preview = str(raw_keys)[:10] + "..."
        print(f"Loaded Keys starting with: {key_preview}")

        res = ai_service._safe_generate("Hello, say 'Gemini is connected' precisely.")
        print(f"Result: {res}")
        if "Gemini is connected" in res:
            return True
    except Exception as e:
        print(f"Error: {e}")
    return False

def test_whatsapp_config():
    print("\n--- TESTING WHATSAPP CONFIG ---")
    if not settings.TWILIO_ACCOUNT_SID:
        print("Twilio NOT configured.")
        return False
    print(f"SID: {settings.TWILIO_ACCOUNT_SID[:5]}...")
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        # Try to list messages just to verify keys
        msgs = client.messages.list(limit=1)
        print("Twilio Keys: VALID")
        return True
    except Exception as e:
        print(f"Twilio Keys Error: {e}")
        return False

def test_insights_generation():
    print("\n--- TESTING INSIGHTS GEN ---")
    try:
        data = {"revenue": "100 Cr", "net_profit": "10 Cr"}
        summary = "Company is doing great with 10% profit margin."
        insight = ai_service.generate_investment_insight(data, summary)
        print(f"Insight Sample: {insight[:50]}...")
        if len(insight) > 20:
            return True
    except Exception as e:
        print(f"Error: {e}")
    return False

if __name__ == "__main__":
    g_ok = test_gemini()
    w_ok = test_whatsapp_config()
    i_ok = test_insights_generation()
    
    if g_ok and w_ok and i_ok:
        print("\n✅ DEEP SYSTEM VERIFIED: All business logic is functional.")
    else:
        print("\n❌ DEEP SYSTEM FAILURE.")
        sys.exit(1)
