"""
InputNode validators — text, number, phone, email.
"""
import pytest
import re

# Validators directly from input.py
VALIDATORS = {
    "text":   lambda v: bool(v),
    "number": lambda v: v.isdigit(),
    "phone":  lambda v: bool(re.match(r"^\+?[\d\s\-]{7,15}$", v)),
    "email":  lambda v: bool(re.match(r"^[^@]+@[^@]+\.[^@]+$", v)),
}


# ── text ──────────────────────────────────────────────────────────────────────

def test_text_valid():
    assert VALIDATORS["text"]("salom")

def test_text_empty_invalid():
    assert not VALIDATORS["text"]("")


# ── number ────────────────────────────────────────────────────────────────────

def test_number_valid():
    assert VALIDATORS["number"]("12345")

def test_number_with_letters_invalid():
    assert not VALIDATORS["number"]("12a")

def test_number_empty_invalid():
    assert not VALIDATORS["number"]("")

def test_number_float_invalid():
    assert not VALIDATORS["number"]("12.5")


# ── phone ─────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("phone", [
    "+998901234567",
    "998901234567",
    "+1 234 567 8901",
    "+7-999-123-45-67",
])
def test_phone_valid(phone):
    assert VALIDATORS["phone"](phone), f"Expected valid: {phone}"

@pytest.mark.parametrize("phone", [
    "abc",
    "123",        # too short
    "+" + "1" * 16,  # too long
])
def test_phone_invalid(phone):
    assert not VALIDATORS["phone"](phone), f"Expected invalid: {phone}"


# ── email ─────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("email", [
    "user@example.com",
    "ali.vali@mail.uz",
    "test+tag@domain.co",
])
def test_email_valid(email):
    assert VALIDATORS["email"](email)

@pytest.mark.parametrize("email", [
    "notanemail",
    "@domain.com",
    "user@",
    "",
])
def test_email_invalid(email):
    assert not VALIDATORS["email"](email)
