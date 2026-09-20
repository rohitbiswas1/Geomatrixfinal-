"""
Geomatrix v2 ML Evaluation utilities
"""
from typing import Dict, Any
from ml.train import load_active_model


def get_model_status() -> Dict[str, Any]:
    """Return current model training status and metrics."""
    artifacts = load_active_model()
    if artifacts is None:
        return {
            "trained": False,
            "message": "Model not trained — insufficient real labeled data.",
            "algorithm": None,
            "trained_at": None,
            "n_samples": None,
            "precision": None,
            "recall": None,
            "f1_score": None,
            "roc_auc": None,
            "rmse": None,
            "feature_names": None,
        }
    _, _, _, meta = artifacts
    return {
        "trained": True,
        "message": f"Model active — trained on {meta['n_samples']} real samples.",
        "algorithm": meta.get("algorithm"),
        "trained_at": meta.get("trained_at"),
        "n_samples": meta.get("n_samples"),
        "precision": meta.get("precision"),
        "recall": meta.get("recall"),
        "f1_score": meta.get("f1_score"),
        "roc_auc": meta.get("roc_auc"),
        "rmse": meta.get("rmse"),
        "feature_names": meta.get("feature_names"),
        "model_version": meta.get("model_version"),
    }
