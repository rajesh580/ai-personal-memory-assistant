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

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title VARCHAR(255),
                content TEXT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_notes_user_id ON notes (user_id)")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                text VARCHAR(255) NOT NULL,
                importance VARCHAR(50),
                completed BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_todos_user_id ON todos (user_id)")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS meetings (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                date VARCHAR(50),
                time VARCHAR(50),
                with_person VARCHAR(255),
                location VARCHAR(255),
                type VARCHAR(50),
                created_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_meetings_user_id ON meetings (user_id)")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS deadlines (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                date VARCHAR(50),
                priority VARCHAR(50),
                created_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_deadlines_user_id ON deadlines (user_id)")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS habits (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                streak INTEGER NOT NULL DEFAULT 0,
                days TEXT NOT NULL DEFAULT '[false,false,false,false,false,false,false]',
                created_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_habits_user_id ON habits (user_id)")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS saved_dates (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                date VARCHAR(50) NOT NULL,
                note TEXT,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_saved_dates_user_id ON saved_dates (user_id)")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS captures (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                type VARCHAR(50) NOT NULL,
                content TEXT,
                date DATETIME NOT NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute("PRAGMA table_info(captures)")
        capture_columns = {row[1] for row in cursor.fetchall()}
        if "audio_url" not in capture_columns:
            cursor.execute("ALTER TABLE captures ADD COLUMN audio_url VARCHAR(500)")
        if "image_url" not in capture_columns:
            cursor.execute("ALTER TABLE captures ADD COLUMN image_url VARCHAR(500)")

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
