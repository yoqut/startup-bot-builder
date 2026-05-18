import base64

from cryptography.fernet import Fernet

from app.settings import settings


def _get_fernet() -> Fernet:
    key = settings.BOT_TOKEN_ENCRYPTION_KEY.encode()
    key = base64.urlsafe_b64encode(key[:32].ljust(32, b"0"))
    return Fernet(key)


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()
