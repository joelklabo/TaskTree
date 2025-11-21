from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from tasktree.settings import settings

# Basic SQLAlchemy session factory (no models yet)
engine = create_engine(settings.database_url, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_session() -> Session:
    return SessionLocal()
