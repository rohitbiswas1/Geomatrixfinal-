"""
Geomatrix v2 ML Prediction
Uses the trained model to predict delay risk for a project.
Never returns fake predictions — returns a clear not-trained result if model is unavailable.
"""
import logging
from typing import Optional, Dict, Any

import numpy as np

import pandas as pd
from ml.features import build_feature_vector, FEATURE_COLUMNS
from ml.train import load_active_model

logger = logging.getLogger(__name__)


def risk_level_from_score(score: float) -> str:
    if score >= 75:
        return "Critical"
    elif score >= 50:
        return "High"
    elif score >= 25:
        return "Medium"
    return "Low"


def predict_project_risk(record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Predict delay risk for a project using the trained model.

    Returns:
        dict with risk_score, risk_level, delay_probability, predicted_delay_days, confidence
        or a structured not-trained result when no real trained model exists.
    """
    model_artifacts = load_active_model()
    if model_artifacts is None:
        return {
            "status": "not_trained",
            "message": "Model not trained — insufficient real labeled data.",
            "risk_score": None,
            "risk_level": None,
            "delay_probability": None,
            "predicted_delay_days": None,
            "confidence": None,
            "model_run_id": None,
            "model_version": None,
            "prediction_generated_at": None,
        }

    clf, reg, scaler, meta = model_artifacts

    try:
        fv = build_feature_vector(record)
        X = pd.DataFrame([[fv[c] for c in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
        X_scaled = scaler.transform(X)

        delay_prob = float(clf.predict_proba(X_scaled)[0][1]) if hasattr(clf, "predict_proba") else float(clf.predict(X_scaled)[0])
        risk_score = round(delay_prob * 100, 1)
        level = risk_level_from_score(risk_score)
        raw_confidence = float(meta.get("roc_auc", 0.0)) if meta.get("roc_auc") is not None else 0.0
        confidence = min(max(raw_confidence, 0.0), 1.0)

        return {
            "status": "ok",
            "risk_score": risk_score,
            "risk_level": level,
            "delay_probability": round(delay_prob, 4),
            "predicted_delay_days": None,
            "confidence": round(confidence, 4),
            "model_run_id": meta.get("run_id"),
            "model_version": meta.get("model_version"),
            "prediction_generated_at": meta.get("trained_at"),
            "message": "Prediction generated from real trained model.",
        }
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        return {
            "status": "error",
            "message": f"Prediction failed: {str(e)}",
            "risk_score": None,
            "risk_level": None,
            "delay_probability": None,
            "predicted_delay_days": None,
            "confidence": None,
            "model_run_id": None,
            "model_version": None,
            "prediction_generated_at": None,
        }
