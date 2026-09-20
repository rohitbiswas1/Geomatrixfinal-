import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, ListFlowable, ListItem
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

def build_pdf():
    pdf_path = os.path.join(os.path.dirname(__file__), "README.pdf")
    downloads_path = r"C:\Users\rohit\Downloads\README.pdf"

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    PRIMARY = colors.HexColor("#0F172A")    
    ACCENT = colors.HexColor("#2563EB")     
    SECONDARY = colors.HexColor("#475569")  
    LIGHT_BG = colors.HexColor("#F8FAFC")   
    BORDER_COLOR = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=PRIMARY,
        alignment=TA_LEFT
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=ACCENT,
        alignment=TA_LEFT
    )

    h1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=10,
        spaceAfter=4
    )

    item_style = ParagraphStyle(
        'ItemStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=SECONDARY
    )

    elements = []

    elements.append(Paragraph("GEOMATRIX — Documentation & File Structure", title_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("Smart India Hackathon 2026 · Comprehensive Project Overview", subtitle_style))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=0, spaceAfter=8))

    sections = [
        {
            "title": "1. Frontend: Next.js Web Application",
            "items": [
                "<b>app/</b>: Main frontend routing directory.",
                "<b>app/dashboard/page.tsx</b>: The Command Center. Provides live KPI metrics, AI risk score charts, and real-time acquisition pipeline statuses.",
                "<b>app/projects/[id]/page.tsx</b>: Deep-dive Risk Analysis page for a single project. Contains What-If simulator and Gemini AI mitigations.",
                "<b>app/map/page.tsx</b>: GIS Risk Map. Plots projects using latitude/longitude and color codes them by risk level.",
                "<b>app/data/page.tsx</b>: Data Management interface. Allows uploading MoSPI CSV files for training and prediction.",
                "<b>lib/apiClient.ts</b>: Centralized API client connecting the frontend to the FastAPI backend.",
            ]
        },
        {
            "title": "2. Backend: FastAPI (geomatrix_v2)",
            "items": [
                "<b>main.py</b>: Entry point for the FastAPI server.",
                "<b>models.py</b>: Defines SQLAlchemy database schemas for Projects, Alerts, ModelRuns, etc.",
                "<b>routers/</b>: Contains API route handlers.",
                "<b>routers/projects.py</b>: CRUD endpoints for projects, dashboard stats, and GIS geojson data.",
                "<b>routers/model.py</b>: Endpoints to train the ML model (RandomForest) and fetch model status.",
                "<b>routers/ingest.py</b>: CSV ingestion logic handling historical data and live project data.",
                "<b>routers/gemini.py</b>: API endpoint for generating AI mitigation strategies via the Gemini LLM.",
            ]
        },
        {
            "title": "3. Database (geomatrix.db)",
            "items": [
                "<b>Database Type</b>: SQLite database (geomatrix.db) located in the backend folder.",
                "<b>projects table</b>: Stores all live project data (land acquired, legal cases, etc.) along with ML risk scores and delay probabilities.",
                "<b>historical_delay_records table</b>: Stores past project data used to train the ML model.",
                "<b>model_runs table</b>: Logs each ML training session with its precision, recall, and ROC-AUC metrics.",
                "<b>alerts table</b>: Stores early warning notifications for critical/high-risk projects.",
            ]
        },
        {
            "title": "4. Machine Learning & Execution Scripts",
            "items": [
                "<b>seed_db.py</b>: Automates the population of the database with initial projects and historical records.",
                "<b>ml/risk_model.py</b> (or similar): Defines the Random Forest pipeline and data scaling logic for risk prediction.",
                "<b>execute_tasks.py</b>: A script in the scratch folder used to batch-ingest data and train the model end-to-end.",
                "<b>audit_risk.py / batch_predict.py</b>: Utility scripts to audit missing risk scores and batch-predict all projects in the DB.",
            ]
        }
    ]

    for sec in sections:
        sec_elements = []
        sec_elements.append(Paragraph(sec["title"], h1_style))
        sec_elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=2, spaceAfter=5))

        for item_desc in sec["items"]:
            sec_elements.append(Paragraph(f"• {item_desc}", item_style))
            sec_elements.append(Spacer(1, 4))

        elements.append(KeepTogether(sec_elements))
        elements.append(Spacer(1, 4))

    doc.build(elements)
    
    # Copy to downloads folder
    import shutil
    shutil.copyfile(pdf_path, downloads_path)
    print(f"PDF built and copied to: {downloads_path}")

if __name__ == "__main__":
    build_pdf()
