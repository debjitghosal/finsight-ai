from sqlalchemy.orm import Session
from app.models.transaction import Transaction


def create_transactions_bulk(db: Session, statement_id: int, user_id: int, items: list[dict]) -> int:
    objs = []
    for it in items:
        objs.append(
            Transaction(
                statement_id=statement_id,
                user_id=user_id,  # ✅ REQUIRED (nullable=False)

                txn_date=it["txn_date"],
                description=it["description"],

                amount=it["amount"],
                txn_type=it["txn_type"],

                merchant=it.get("merchant"),  # optional (we can fill later)
                category_id=it.get("category_id"),
                subcategory_id=it.get("subcategory_id"),
            )
        )

    db.add_all(objs)
    db.commit()
    return len(objs)
