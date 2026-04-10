import sqlite3
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{(DATA_DIR / 'memories.db').as_posix()}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    db_path = DATA_DIR / "memories.db"
    connection = sqlite3.connect(db_path)
    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_token ON user_sessions (token)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_user_id ON user_sessions (user_id)")

        cursor.execute("PRAGMA table_info(memories)")
        memory_columns = {row[1] for row in cursor.fetchall()}
        if "user_id" not in memory_columns:
            cursor.execute("ALTER TABLE memories ADD COLUMN user_id INTEGER")
            cursor.execute(
                """
                UPDATE memories
                SET user_id = (
                    SELECT id FROM users WHERE email = 'legacy@local'
                )
                WHERE user_id IS NULL
                """
            )

        cursor.execute("SELECT id FROM users WHERE email = ?", ("legacy@local",))
        legacy_user = cursor.fetchone()
        if legacy_user is None:
            cursor.execute(
                "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, datetime('now'))",
                ("legacy@local", "legacy-account-disabled"),
            )
            legacy_user_id = cursor.lastrowid
        else:
            legacy_user_id = legacy_user[0]

        cursor.execute("UPDATE memories SET user_id = ? WHERE user_id IS NULL", (legacy_user_id,))
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_memories_user_id ON memories (user_id)")
        connection.commit()
    finally:
        connection.close()
