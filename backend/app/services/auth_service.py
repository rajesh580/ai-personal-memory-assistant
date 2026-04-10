import hashlib
import hmac
import secrets
from datetime import datetime

from sqlalchemy.orm import Session

from ..models import User, UserSession


class AuthService:
    def hash_password(self, password: str) -> str:
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000,
        ).hex()
        return f"{salt}${digest}"

    def verify_password(self, password: str, stored_hash: str) -> bool:
        if "$" not in stored_hash:
            return False
        salt, expected = stored_hash.split("$", 1)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000,
        ).hex()
        return hmac.compare_digest(digest, expected)

    def create_user(self, db: Session, email: str, password: str) -> User:
        user = User(
            email=email,
            password_hash=self.hash_password(password),
            created_at=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def authenticate_user(self, db: Session, email: str, password: str) -> User | None:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            return None
        if not self.verify_password(password, user.password_hash):
            return None
        return user

    def create_session(self, db: Session, user: User) -> str:
        token = secrets.token_urlsafe(32)
        session = UserSession(user_id=user.id, token=token, created_at=datetime.utcnow())
        db.add(session)
        db.commit()
        return token

    def delete_session(self, db: Session, token: str) -> None:
        db.query(UserSession).filter(UserSession.token == token).delete()
        db.commit()

    def get_user_by_token(self, db: Session, token: str) -> User | None:
        session = db.query(UserSession).filter(UserSession.token == token).first()
        if session is None:
            return None
        return db.query(User).filter(User.id == session.user_id).first()
