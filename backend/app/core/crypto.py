import hashlib
from cryptography.fernet import Fernet

from app.core.config import settings


# -------------------------
# Masking helpers (UI/privacy)
# -------------------------
def mask_email(email: str) -> str:
    username, domain = email.split("@")
    if len(username) <= 3:
        masked = "*" * len(username)
    else:
        masked = username[:3] + "*" * (len(username) - 3)
    return f"{masked}@{domain}"


def mask_name(name: str) -> str:
    if not name:
        return ""
    if len(name) <= 2:
        return name[0] + "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]


# -------------------------
# One-way hashing (NOT for saved PDF password)
# -------------------------
def sha256_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


# -------------------------
# Reversible encryption (FOR saved PDF password)
# -------------------------
def _fernet() -> Fernet:
    # settings.ENCRYPTION_KEY must be a Fernet key (base64 urlsafe)
    return Fernet(settings.ENCRYPTION_KEY)


def encrypt_text(text: str) -> str:
    return _fernet().encrypt(text.encode("utf-8")).decode("utf-8")


def decrypt_text(token: str) -> str:
    return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
