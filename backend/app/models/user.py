from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String(100), nullable=False)

    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    def masked_email(self) -> str:
        """
        Example:
        debjitghosal1234@gmail.com
        -> debjit******1234@gmail.com
        """
        name, domain = self.email.split("@")
        if len(name) <= 4:
            return "*" * len(name) + "@" + domain
        return f"{name[:4]}{'*' * (len(name) - 8)}{name[-4:]}@{domain}"
