from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user_in: UserCreate):
    hashed_pw = hash_password(user_in.password)

    db_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        username=user_in.username if user_in.username else None,
        hashed_password=hashed_pw,
        is_active=True
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user
