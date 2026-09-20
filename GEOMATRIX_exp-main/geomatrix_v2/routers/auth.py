"""Geomatrix v2 Auth Router"""
import secrets
from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str


@router.post("/login")
def login(body: LoginRequest, response: Response):
    raise HTTPException(403, "Demo login is disabled. Configure a production auth provider before enabling sign-in.")


@router.post("/google")
def google_login(body: GoogleLoginRequest, response: Response):
    """Accept Google JWT credential and create session."""
    try:
        import base64, json as _json
        parts = body.credential.split(".")
        payload_b64 = parts[1] + "=="
        payload = _json.loads(base64.urlsafe_b64decode(payload_b64))
        email = payload.get("email", "google_user@gmail.com")
        name = payload.get("name", "Google User")
        picture = payload.get("picture", "")
    except Exception:
        email = "google_user@gmail.com"
        name = "Google User"
        picture = ""

    token = secrets.token_hex(32)
    response.set_cookie("geomatrix_session", token, httponly=True, samesite="lax")
    return {
        "success": True,
        "user": {"email": email, "name": name, "picture": picture, "role": "Project Officer"},
        "token": token,
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("geomatrix_session")
    return {"success": True}


@router.get("/google/callback")
def google_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    """Compatibility callback for Google OAuth redirect flows.

    The front-end uses the Google Identity Services SDK and validates the ID token
    in the Next.js route; this endpoint is kept for callback consistency with the
    configured Google redirect URI.
    """
    if error:
        raise HTTPException(400, f"Google OAuth callback error: {error}")
    return {
        "success": True,
        "message": "Google OAuth callback received.",
        "code": code,
        "state": state,
        "redirect_to": "http://127.0.0.1:3000",
    }


@router.get("/health")
def health():
    return {"status": "ok"}
