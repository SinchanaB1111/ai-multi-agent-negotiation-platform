import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

logger = logging.getLogger("negotiation_backend")

def create_db_engine(url: str):
    # Normalize DATABASE_URL (Supabase/Heroku often provide 'postgres://' which SQLAlchemy requires as 'postgresql://')
    db_url = url
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    connect_args = {}
    engine_kwargs = {"echo": False}

    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        engine_kwargs["connect_args"] = connect_args
    else:
        engine_kwargs.update({
            "pool_pre_ping": True,
            "pool_size": 10,
            "max_overflow": 20,
            "pool_recycle": 300,
        })
    return create_engine(db_url, **engine_kwargs)

db_url = settings.DATABASE_URL
try:
    engine = create_db_engine(db_url)
    # Test connection immediately
    if not db_url.startswith("sqlite"):
        with engine.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
except Exception as err:
    if settings.APP_ENV.lower() in {"prod", "production"}:
        logger.error("Could not connect to the configured production database.")
        raise RuntimeError("Configured production database is unavailable.") from err
    logger.warning("Could not connect to the configured database. Falling back to local SQLite for development.")
    engine = create_db_engine("sqlite:///./negotiation.db")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> bool:
    """Utility to test if the database is reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return False


