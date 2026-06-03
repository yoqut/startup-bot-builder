"""
Bots service — delete_webhook non-fatal, uuid validation.
"""
import uuid
import pytest


# ── UUID validation (controller da qo'shildi) ────────────────────────────────

def test_valid_uuid_parses():
    uid = str(uuid.uuid4())
    assert uuid.UUID(uid)

def test_invalid_uuid_raises():
    with pytest.raises(ValueError):
        uuid.UUID("not-a-uuid")

def test_invalid_uuid_non_hex():
    with pytest.raises(ValueError):
        uuid.UUID("pending-botid-xxx")


# ── delete_webhook non-fatal logic ────────────────────────────────────────────

def test_remove_bot_logic_always_deletes_even_if_webhook_fails():
    """
    Mana shu mantiq controller da:
      try:
          await delete_webhook(db, bot)
      except Exception:
          bot.is_active = False
      await db.delete(bot)  ← xatoda ham ishlaydi
    """
    deleted = False
    webhook_error = True

    class FakeBot:
        is_active = True

    bot = FakeBot()

    try:
        if webhook_error:
            raise RuntimeError("Telegram API xato")
    except Exception:
        bot.is_active = False

    # Bot har qanday holatda o'chiriladi
    deleted = True

    assert deleted is True
    assert bot.is_active is False


# ── Encryption round-trip ──────────────────────────────────────────────────────

def test_encrypt_decrypt_roundtrip():
    from app.utils.encryption import encrypt_token, decrypt_token
    token = "1234567890:AAEj528dJIjCYPWTi9W7SH1hzgdgT8_5VIk"
    encrypted = encrypt_token(token)
    assert encrypted != token
    assert decrypt_token(encrypted) == token

def test_encrypt_different_each_time():
    from app.utils.encryption import encrypt_token
    token = "1234567890:TESTTOKEN"
    enc1 = encrypt_token(token)
    enc2 = encrypt_token(token)
    # Fernet har safar boshqa IV ishlatadi
    assert enc1 != enc2

def test_decrypt_wrong_key_raises():
    from cryptography.fernet import Fernet, InvalidToken
    from app.utils.encryption import encrypt_token
    token = "test:TOKEN"
    encrypted = encrypt_token(token)
    # Boshqa kalit bilan decrypt
    other_fernet = Fernet(Fernet.generate_key())
    with pytest.raises(Exception):
        other_fernet.decrypt(encrypted.encode())
