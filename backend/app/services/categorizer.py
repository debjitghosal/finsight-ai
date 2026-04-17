from sqlalchemy.orm import Session
from app.models.merchant_mapping import MerchantMapping
from app.models.category import Category, SubCategory


def normalize_text(text: str) -> str:
    return (text or "").strip().lower()


def get_or_create_misc_category(db: Session) -> Category:
    """
    Ensures a 'Miscellaneous' category always exists.
    """
    misc = db.query(Category).filter(Category.name == "Miscellaneous").first()
    if misc:
        return misc

    misc = Category(name="Miscellaneous")
    db.add(misc)
    db.commit()
    db.refresh(misc)
    return misc


def categorize_description(db: Session, description: str):
    """
    Returns: (category_id, subcategory_id)
    Uses DB mappings first; falls back to Miscellaneous.
    """
    desc = normalize_text(description)

    # Load active mappings (simple keyword match)
    mappings = (
        db.query(MerchantMapping)
        .filter(MerchantMapping.is_active == True)  # noqa: E712
        .all()
    )

    for m in mappings:
        key = normalize_text(m.keyword)
        if key and key in desc:
            return m.category_id, m.subcategory_id

    # fallback
    misc = get_or_create_misc_category(db)
    return misc.id, None
