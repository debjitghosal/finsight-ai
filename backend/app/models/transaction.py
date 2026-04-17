from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    statement_id = Column(Integer, ForeignKey("statements.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    txn_date = Column(Date, nullable=False)
    description = Column(String(500), nullable=False)

    amount = Column(Float, nullable=False)
    txn_type = Column(String(10), nullable=False)  # DEBIT / CREDIT

    merchant = Column(String(200), nullable=True)

    # Category/Subcategory assigned by mapping/categorizer
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True)

    statement = relationship("Statement", back_populates="transactions")
