from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class MerchantMapping(Base):
    __tablename__ = "merchant_mappings"

    id = Column(Integer, primary_key=True, index=True)

    # A keyword or pattern to match in transaction description
    keyword = Column(String(200), nullable=False, index=True)

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True)

    # Optional: enable/disable rule without deleting
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category", back_populates="mappings")
    subcategory = relationship("SubCategory", back_populates="mappings")
