import yfinance as yf
from typing import Optional, Dict

def get_live_price(ticker: str, exchange: str = "NSE") -> Optional[Dict]:
    """
    Fetches the Last Traded Price (LTP) and day change for a given ticker.
    Maps Indian exchanges to Yahoo Finance format.
    """
    try:
        # Map exchange to suffix
        suffix = ""
        if exchange.upper() == "NSE":
            suffix = ".NS"
        elif exchange.upper() == "BSE":
            suffix = ".BO"
        
        yf_ticker = f"{ticker.upper()}{suffix}"
        stock = yf.Ticker(yf_ticker)
        
        # Get current data
        # 'fast_info' or 'history(period="1d")' are generally reliable
        data = stock.history(period="1d")
        if data.empty:
            return None
            
        current_price = data['Close'].iloc[-1]
        previous_close = data['Open'].iloc[-1] # Simplistic change calc for 1d
        
        change = current_price - previous_close
        percent_change = (change / previous_close) * 100
        
        return {
            "price": round(current_price, 2),
            "change": round(change, 2),
            "percent_change": round(percent_change, 2),
            "currency": "INR" if suffix else "USD",
            "symbol": yf_ticker
        }
    except Exception as e:
        print(f"Error fetching price for {ticker}: {e}")
        return None
