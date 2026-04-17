from app.core.config import settings

def send_whatsapp_summary(phone_number: str, message: str) -> dict:
    if not settings.TWILIO_ACCOUNT_SID:
        return {"success": False, "error": "Twilio not configured"}
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        import re
        # Strip everything except digits
        clean_digits = re.sub(r'\D', '', phone_number)
        
        # If it's a 10-digit number and doesn't already start with a country code, assume India (+91)
        if len(clean_digits) == 10:
            final_to = f"whatsapp:+91{clean_digits}"
        else:
            final_to = f"whatsapp:+{clean_digits}"
            
        replacements = {
            "–": "-", "—": "-", # dashes
            "‘": "'", "’": "'", "“": '"', "”": '"', # smart quotes
            "•": "-", "●": "-", "▪": "-", "◦": "-", # bullets
            "✓": "ok", "✅": "OK", "×": "x", "…": "...", "₹": "INR ",
            "→": "->", "←": "<-"
        }
        for char, replacement in replacements.items():
            message = message.replace(char, replacement)

        sender = str(settings.TWILIO_WHATSAPP_FROM)
        if not sender.startswith("whatsapp:"):
            sender = f"whatsapp:{sender}"
            
        print(f"DEBUG: Normalizing '{phone_number}' -> '{final_to}'")
        print(f"DEBUG: Sending WhatsApp from {sender} to {final_to}")
        
        msg = client.messages.create(from_=sender, to=final_to, body=message[:1600])
        print(f"DEBUG: Twilio accepted msg with SID: {msg.sid}, Status: {msg.status}")
        
        return {"success": True, "message_sid": msg.sid}
    except Exception as e:
        print(f"DEBUG: WhatsApp send Error: {str(e)}")
        return {"success": False, "error": str(e)}
