from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(60), unique=True, nullable=False)

    subcategories = relationship("SubCategory", back_populates="category")
    mappings = relationship("MerchantMapping", back_populates="category")


class SubCategory(Base):
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    name = Column(String(80), nullable=False)

    category = relationship("Category", back_populates="subcategories")
    mappings = relationship("MerchantMapping", back_populates="subcategory")
