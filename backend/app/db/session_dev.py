from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config_dev import dev_settings
from app.db.session import Base  # Import the same Base used by models

# Create SQLite engine for development
engine = create_engine(
    dev_settings.SQLALCHEMY_DATABASE_URI,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    echo=False  # Set to True for SQL query logging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all tables in the database"""
    # Import all models so they are registered with Base
    try:
        from app.models import user, teacher, assessment, gamification, learning_path, message, parent_child, question, quiz_attempt, student_progress
        print("📋 Imported database models")
    except ImportError as e:
        print(f"⚠️  Warning: Could not import some models: {e}")
    
    Base.metadata.create_all(bind=engine)
    print(f"📊 Created {len(Base.metadata.tables)} database tables")