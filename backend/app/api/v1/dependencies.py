from litestar.connection import Request
from litestar.exceptions import HTTPException

from app.utils.auth import decode_token


def get_current_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token kerak")
    token = auth.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Token yaroqsiz")


def require_superadmin(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token kerak")
    token = auth.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        if payload.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Ruxsat yo'q")
        return payload["sub"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token yaroqsiz")
