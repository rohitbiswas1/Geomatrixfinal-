from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers.alerts import router as alerts_router
from routers.auth import router as auth_router
from routers.gemini import router as gemini_router
from routers.ingest import router as ingest_router
from routers.map import router as map_router
from routers.ml import router as ml_router
from routers.projects import router as projects_router

app = FastAPI(title="Geomatrix v2")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(gemini_router)
app.include_router(projects_router)
app.include_router(alerts_router)
app.include_router(ingest_router)
app.include_router(map_router)
app.include_router(ml_router)

init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
