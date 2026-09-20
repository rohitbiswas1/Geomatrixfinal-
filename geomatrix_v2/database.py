"""Database session factory for Geomatrix v2 (SQLite)."""
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from models import Base

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "geomatrix.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"


class _DynamicEngine:
    """Proxy engine that follows the current DATABASE_URL value."""

    def __init__(self):
        self._engine = None

    def _ensure_engine(self):
        current_url = globals().get("DATABASE_URL", DATABASE_URL)
        if self._engine is None:
            self._engine = create_engine(
                current_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
                echo=False,
            )
        elif str(self._engine.url) != current_url:
            self._engine.dispose()
            self._engine = create_engine(
                current_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
                echo=False,
            )
        return self._engine

    def __getattr__(self, name):
        return getattr(self._ensure_engine(), name)

    def __call__(self, *args, **kwargs):
        return self._ensure_engine()(*args, **kwargs)


engine = _DynamicEngine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# New columns added in the real-data upgrade. ALTER TABLE is idempotent because
# SQLite raises "duplicate column name" which we silently ignore.
_MIGRATION_STATEMENTS = [
    "ALTER TABLE projects ADD COLUMN compensation_status TEXT",
    "ALTER TABLE projects ADD COLUMN objection_count INTEGER DEFAULT 0",
    "ALTER TABLE projects ADD COLUMN legal_case_count INTEGER DEFAULT 0",
    "ALTER TABLE projects ADD COLUMN rr_status TEXT",
    "ALTER TABLE projects ADD COLUMN env_clearance_status TEXT",
    "ALTER TABLE projects ADD COLUMN forest_clearance_status TEXT",
    "ALTER TABLE projects ADD COLUMN crz_status TEXT",
    "ALTER TABLE projects ADD COLUMN doc_completeness_pct REAL DEFAULT 50.0",
    "ALTER TABLE projects ADD COLUMN approval_pending INTEGER DEFAULT 0",
    "ALTER TABLE projects ADD COLUMN overdue_milestones INTEGER DEFAULT 0",
]


def _run_migrations():
    """Apply schema migrations safely (idempotent)."""
    with engine.connect() as conn:
        for stmt in _MIGRATION_STATEMENTS:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                # Column already exists — safe to ignore
                pass


def init_db():
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    logger.info("Database initialised and migrations applied.")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
