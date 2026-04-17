from app.db.base_class import Base

# Import all models so SQLAlchemy can register them
from app.models.user import User
from app.models.statement import Statement
from app.models.transaction import Transaction
from app.models.category import Category, SubCategory
from app.models.merchant_mapping import MerchantMapping
from app.models.pdf_password_secret import PdfPasswordSecret
from app.models.annual_report import AnnualReport
