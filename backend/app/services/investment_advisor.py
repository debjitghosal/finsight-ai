from app.services.ai_service import generate_investment_insight

def get_investment_advice(financial_data: dict, summary: str) -> str:
    return generate_investment_insight(financial_data, summary)
