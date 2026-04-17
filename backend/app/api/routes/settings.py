from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.category import Category, SubCategory
from app.models.merchant_mapping import MerchantMapping

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.post("/categories")
def create_category(
    name: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    existing = db.query(Category).filter(Category.name == name).first()
    if existing:
        return existing

    cat = Category(name=name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.get("/categories")
def list_categories(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(Category).all()


@router.post("/subcategories")
def create_subcategory(
    category_id: int,
    name: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    sub = SubCategory(category_id=category_id, name=name)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/subcategories")
def list_subcategories(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(SubCategory).all()


@router.post("/mappings")
def create_mapping(
    keyword: str,
    category_id: int,
    subcategory_id: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if subcategory_id is not None:
        sub = db.query(SubCategory).filter(SubCategory.id == subcategory_id).first()
        if not sub:
            raise HTTPException(status_code=404, detail="Subcategory not found")

    mapping = MerchantMapping(
        keyword=keyword,
        category_id=category_id,
        subcategory_id=subcategory_id,
        is_active=True
    )

    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.get("/mappings")
def list_mappings(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(MerchantMapping).all()
