import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

def build_pdf():
    pdf_path = os.path.join(os.path.dirname(__file__), "GEOMATRIX_TODO_CHECKLIST.pdf")
    downloads_path = r"C:\Users\rohit\Downloads\GEOMATRIX_TODO_CHECKLIST.pdf"

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    PRIMARY = colors.HexColor("#0F172A")    # Dark slate
    ACCENT = colors.HexColor("#2563EB")     # Royal Blue
    SECONDARY = colors.HexColor("#475569")  # Slate gray
    LIGHT_BG = colors.HexColor("#F8FAFC")   # Soft gray bg
    BORDER_COLOR = colors.HexColor("#E2E8F0")
    SUCCESS_COLOR = colors.HexColor("#166534")

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
        'Heading1_Custom',
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

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=PRIMARY
    )

    table_cell_code = ParagraphStyle(
        'TableCellCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=ACCENT
    )

    elements = []

    elements.append(Paragraph("GEOMATRIX — Roadmap & Actionable Next Tasks", title_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("Smart India Hackathon 2026 · Problem Statement 26017 · Land Acquisition Risk Intelligence", subtitle_style))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=0, spaceAfter=8))

    sections = [
        {
            "title": "TASK 1: Initialize Database & Load Baseline Data",
            "items": [
                ("1.1 Seed SQLite Database", "Run the database seed script to populate historical delay records and initial infrastructure projects:\n<b>Command:</b> cd geomatrix_v2 && python seed_db.py\n<b>Output:</b> Creates geomatrix.db with 20 historical training records & 6 baseline projects."),
                ("1.2 Verify FastAPI Environment Variables", "Check .env.local contains GOOGLE_GEMINI_API_KEY and NEXT_PUBLIC_API_URL='http://127.0.0.1:8000'.")
            ]
        },
        {
            "title": "TASK 2: Start Backend API & Train ML Model on Real Data",
            "items": [
                ("2.1 Launch FastAPI Server", "Start backend server:\n<b>Command:</b> cd geomatrix_v2 && python -m uvicorn main:app --reload --port 8000\n<b>Verify:</b> http://127.0.0.1:8000/health returns {'status':'ok'}."),
                ("2.2 Ingest Real MoSPI CSV Dataset", "Navigate to /data page (Data Ingestion) and upload your MoSPI PAIMANA Flash Report CSV under 'Historical Data' (data_type=historical)."),
                ("2.3 Train ML Risk Classifier", "Trigger training via /model page or POST /api/model/train. Model will save RandomForest/XGBoost artifacts and output Precision, Recall, F1, and ROC-AUC scores.")
            ]
        },
        {
            "title": "TASK 3: Ingest Active Projects & Run AI Risk Predictions",
            "items": [
                ("3.1 Ingest Active Projects CSV", "Upload MoSPI/Project CSV under 'Projects Data' (data_type=projects) via Data Ingestion screen (/data)."),
                ("3.2 Run Risk Prediction & SHAP Explainability", "Open any project in /projects/[id], click 'Run Risk Prediction'. Verify Risk Score, Risk Level Badge (Critical/High/Medium/Low), and SHAP Feature Importance chart."),
                ("3.3 Test What-If Simulator", "Adjust legal dispute and pending claim sliders on project detail page to observe live risk score changes."),
                ("3.4 Generate Gemini Mitigation Insights", "Click 'Generate AI Mitigation Plan' to test Gemini LLM decision recommendations.")
            ]
        },
        {
            "title": "TASK 4: Verify GIS Map, Early Warnings & Reporting Modules",
            "items": [
                ("4.1 Verify GIS Spatial Map (/map)", "Confirm project GPS coordinates display colored risk markers with popups and district filters."),
                ("4.2 Verify Early Warning Alerts Hub (/alerts)", "Confirm automatic alert generation for delay bottlenecks and test Acknowledge/Resolve actions."),
                ("4.3 Verify PDF & Excel Export (/reports)", "Export project risk summary reports to PDF, Excel (.xls), and CSV.")
            ]
        },
        {
            "title": "TASK 5: Final Production Build & Hackathon Presentation Sequence",
            "items": [
                ("5.1 Run Production Build Check", "Verify Next.js compiles without errors:\n<b>Command:</b> npm run build"),
                ("5.2 Dry-Run Hackathon Presentation Sequence", "Order: Demo Login ➔ Executive Dashboard ➔ Live MoSPI CSV Ingestion ➔ Train ML Model Live ➔ Predict & SHAP Deep-Dive ➔ What-If Simulation ➔ Executive PDF Export.")
            ]
        }
    ]

    for sec in sections:
        sec_elements = []
        sec_elements.append(Paragraph(sec["title"], h1_style))
        sec_elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=2, spaceAfter=5))

        for item_title, item_desc in sec["items"]:
            content = f"<b>[  ] {item_title}</b> — {item_desc.replace(chr(10), '<br/>')}"
            sec_elements.append(Paragraph(content, item_style))
            sec_elements.append(Spacer(1, 4))

        elements.append(KeepTogether(sec_elements))
        elements.append(Spacer(1, 4))

    table_data = [
        [
            Paragraph("Sequential Task Step", table_header_style),
            Paragraph("Execution Command", table_header_style),
            Paragraph("Directory", table_header_style)
        ],
        [
            Paragraph("1. Seed Database", table_cell_style),
            Paragraph("python seed_db.py", table_cell_code),
            Paragraph("geomatrix_v2/", table_cell_style)
        ],
        [
            Paragraph("2. Run Pytest Suite", table_cell_style),
            Paragraph("python -m pytest tests/ -v", table_cell_code),
            Paragraph("geomatrix_v2/", table_cell_style)
        ],
        [
            Paragraph("3. Start FastAPI Server", table_cell_style),
            Paragraph("python -m uvicorn main:app --reload --port 8000", table_cell_code),
            Paragraph("geomatrix_v2/", table_cell_style)
        ],
        [
            Paragraph("4. Start Next.js Frontend", table_cell_style),
            Paragraph("npm run dev", table_cell_code),
            Paragraph("Root folder", table_cell_style)
        ],
        [
            Paragraph("5. Production Build", table_cell_style),
            Paragraph("npm run build", table_cell_code),
            Paragraph("Root folder", table_cell_style)
        ]
    ]

    table = Table(table_data, colWidths=[130, 280, 130])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ]))

    cmd_elements = [
        Paragraph("Quick Execution Steps Summary", h1_style),
        HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=2, spaceAfter=5),
        table
    ]
    elements.append(KeepTogether(cmd_elements))

    doc.build(elements)
    
    # Copy to downloads folder
    import shutil
    shutil.copyfile(pdf_path, downloads_path)
    print(f"PDF built and copied to: {downloads_path}")

if __name__ == "__main__":
    build_pdf()
