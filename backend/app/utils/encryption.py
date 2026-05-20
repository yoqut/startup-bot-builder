import base64
import hashlib

from cryptography.fernet import Fernet

from app.settings import settings

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        # Derive a stable 32-byte key via SHA-256 so any-length secret works correctly
        raw = settings.BOT_TOKEN_ENCRYPTION_KEY.encode()
        digest = hashlib.sha256(raw).digest()          # always 32 bytes
        key = base64.urlsafe_b64encode(digest)         # Fernet requires URL-safe base64
        _fernet = Fernet(key)
    return _fernet


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()
