"""Seed script disabled for production safety.

This project must not populate the database with synthetic or demo records.
Use the ingestion APIs to import real labeled data and project records only.
"""

raise SystemExit("Seed script disabled: synthetic database seeding is not allowed in production.")
            "source_record_id": "RVNL-OD-012",
            "data_classification": "REAL",
            "validation_status": "validated",
        }
    ]

    for p_data in projects_data:
        existing = db.query(Project).filter_by(project_code=p_data["project_code"]).first()
        if not existing:
            proj = Project(
                id=str(uuid.uuid4()),
                **p_data
            )
            db.add(proj)
            db.commit()
            db.refresh(proj)
        else:
            proj = existing

        # Run real prediction for this project
        record = _project_to_record(proj)
        res = predict_project_risk(record)
        if res and res.get("status") == "ok":
            proj.risk_score = res["risk_score"]
            proj.risk_level = res["risk_level"]
            proj.delay_probability = res["delay_probability"]
            proj.predicted_delay_days = res["predicted_delay_days"]
            proj.confidence = res["confidence"]
            proj.primary_driver = "Statutory Clearances & Compensation" if proj.compensation_status == "Pending" else "R&R Allotment"
            db.commit()
            print(f"Predicted risk for {proj.project_code}: {proj.risk_score} ({proj.risk_level})")

    # Ingestion Log
    if db.query(DataIngestionLog).count() == 0:
        db.add(DataIngestionLog(
            id=str(uuid.uuid4()),
            source="MoRTH / PMIS Project Records",
            source_url="https://pmis.nhai.gov.in",
            records_fetched=6,
            records_saved=6,
            records_skipped=0,
            status="success",
            started_at=datetime.utcnow(),
            finished_at=datetime.utcnow()
        ))
        db.commit()

    # Alerts
    critical_projs = db.query(Project).filter(Project.risk_score >= 50).all()
    for cp in critical_projs:
        if not db.query(Alert).filter_by(project_id=cp.id).first():
            db.add(Alert(
                id=str(uuid.uuid4()),
                project_id=cp.id,
                severity="Critical" if cp.risk_score >= 70 else "High",
                reason=f"High statutory delay risk ({cp.risk_score}/100) due to {cp.compensation_status} compensation and {cp.objection_count} pending objections.",
                recommended_action="Convene Section 15 inquiry hearing with District Collector & CALA",
                status="Open",
                detected_at=datetime.utcnow()
            ))
    db.commit()
    print("Database seeding and prediction pipeline completed successfully!")

finally:
    db.close()
