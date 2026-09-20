import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/gemini", tags=["gemini"])


class GeminiRequest(BaseModel):
    project: dict[str, Any]
    prediction: dict[str, Any] | None = None
    shap_features: list[dict[str, Any]] | None = None


def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _get_gemini_api_key() -> str | None:
    _load_env_file()
    return os.getenv("GEMINI_API_KEY")


def _build_prompt(req: GeminiRequest) -> str:
    project = req.project or {}
    prediction = req.prediction or {}
    shap = req.shap_features or []

    feature_summary = "\n".join(
        f"- {item.get('feature', 'unknown')}: {item.get('shap_value', 0)} ({item.get('direction', 'neutral')})"
        for item in shap[:8]
    ) or "- No SHAP features available."

    return (
        "You are a risk decision-support assistant for land-acquisition monitoring. "
        "Use ONLY the supplied project facts, model outputs, and SHAP values below. "
        "Do not invent project facts, risk scores, probabilities, sources, or legal status. "
        "Clearly label your response as AI-generated decision support.\n\n"
        f"Project data:\n{project}\n\n"
        f"ML prediction:\n{prediction}\n\n"
        f"Actual SHAP contributions:\n{feature_summary}\n\n"
        "Provide: 1) a concise explanation of the key risk drivers, 2) a short list of evidence-based recommendations, "
        "3) a note that this is AI-generated decision support and not a binding legal or administrative determination."
    )


@router.post("/explain")
async def explain_with_gemini(req: GeminiRequest):
    api_key = _get_gemini_api_key()
    if not api_key:
        raise HTTPException(503, "GEMINI_API_KEY is not configured in the .env file.")

    try:
        from google import genai
    except ImportError as exc:
        raise HTTPException(500, "google-genai SDK is not installed.") from exc

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=_build_prompt(req),
        )
        text = getattr(response, "text", None) or str(response)
        return {
            "status": "ok",
            "label": "AI-generated decision support",
            "summary": text,
            "source": "gemini",
        }
    except Exception as exc:  # pragma: no cover - runtime external dependency issue
        raise HTTPException(502, f"Gemini explanation failed: {exc}") from exc