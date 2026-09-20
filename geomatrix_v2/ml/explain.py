"""
Geomatrix v2 SHAP Explanations
Computes real SHAP values using the trained model.
Returns None if model not trained — never fabricates explanations.
"""
import logging
from typing import Optional, List, Dict, Any

import numpy as np
import shap

from ml.features import build_feature_vector, FEATURE_COLUMNS
from ml.train import load_active_model

logger = logging.getLogger(__name__)

FEATURE_DESCRIPTIONS = {
    "land_area_ha": "Total land area required for acquisition (hectares)",
    "affected_families": "Number of families displaced or affected",
    "pending_claims": "Objection / compensation claims awaiting resolution",
    "legal_cases": "Active legal disputes and court cases",
    "doc_completeness_pct": "Documentation completeness (higher = better)",
    "approval_pending": "Whether statutory approval is still pending",
    "rr_pending": "Rehabilitation & Resettlement cases pending",
    "overdue_milestones": "Number of acquisition milestones past deadline",
    "compensation_pending": "Whether compensation payment is pending or disputed",
    "env_clearance_pending": "Environmental, forest or CRZ clearance still pending",
}


def explain_project(record: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
    """
    Compute SHAP values for a project using the trained classifier.

    Returns:
        List of {feature, shap_value, direction, description} sorted by |shap_value|
        or None if no trained model exists.
    """
    model_artifacts = load_active_model()
    if model_artifacts is None:
        return None

    clf, reg, scaler, meta = model_artifacts

    try:
        fv = build_feature_vector(record)
        X = np.array([[fv[c] for c in FEATURE_COLUMNS]])
        X_scaled = scaler.transform(X)

        # Build SHAP explainer
        explainer = shap.TreeExplainer(clf)
        shap_vals = explainer.shap_values(X_scaled)

        # SHAP versions return either a class list or an array shaped
        # (samples, features, classes) for binary classifiers.
        if isinstance(shap_vals, list) and len(shap_vals) == 2:
            vals = np.asarray(shap_vals[1])[0]
        else:
            values = np.asarray(shap_vals)
            if values.ndim == 3:
                vals = values[0, :, 1]
            elif values.ndim == 2:
                vals = values[0]
            else:
                vals = values

        results = []
        for i, feat in enumerate(FEATURE_COLUMNS):
            sv = float(vals[i])
            results.append({
                "feature": feat,
                "display_name": feat.replace("_", " ").title(),
                "shap_value": round(sv, 4),
                "direction": "up" if sv > 0 else "down",
                "description": FEATURE_DESCRIPTIONS.get(feat, feat),
                "feature_value": round(float(fv[feat]), 2),
            })

        # Sort by absolute SHAP value descending
        results.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return results

    except Exception as e:
        logger.error(f"SHAP explanation failed: {e}")
        return None
