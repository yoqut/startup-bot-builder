"""Litestar dependency for extracting current user from JWT."""
from __future__ import annotations

import uuid

from litestar.connection import Request
from litestar.exceptions import NotAuthorizedException

from src.auth.service import TokenExpiredError, verify_access_token


async def current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise NotAuthorizedException("Missing Bearer token")

    token = auth_header.removeprefix("Bearer ")
    try:
        payload = verify_access_token(token)
    except TokenExpiredError as e:
        raise NotAuthorizedException(str(e)) from e

    return {
        "id": uuid.UUID(payload["sub"]),
        "role": payload.get("role", "user"),
    }


async def require_admin(request: Request) -> dict:
    user = await current_user(request)
    if user["role"] not in ("admin", "super_admin"):
        raise NotAuthorizedException("Admin access required")
    return user
