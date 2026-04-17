from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserCreate, UserRead
from app.crud.user import get_user_by_email, create_user
from app.core.security import verify_password, create_access_token
from app.api.deps import get_current_user
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED
)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        user = create_user(db, user_in)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")


# ✅ OAuth2-compatible login (Swagger Authorize will work)
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Swagger sends `username`, we treat it as email
    user = get_user_by_email(db, form_data.username)
    if not user:
        raise HTTPException(status_code=401, detail="NO_ACCOUNT_FOUND")

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="WRONG_PASSWORD")

    access_token = create_access_token(data={"sub": str(user.id)})

    return {"access_token": access_token, "token_type": "bearer"}


from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.core.config import settings

@router.post("/google")
def google_login(payload: dict, db: Session = Depends(get_db)):
    token = payload.get("credential")
    if not token:
        raise HTTPException(status_code=400, detail="Google token missing")
        
    try:
        # Verify the Google Token
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
        
        email = idinfo['email']
        name = idinfo.get('name', '')
        
        # Check if user exists
        user = get_user_by_email(db, email)
        if not user:
            # Create a new user if not exists
            # We use a random/dummy password for Google-only users
            import uuid
            user_in = UserCreate(
                email=email,
                full_name=name,
                password=str(uuid.uuid4())
            )
            user = create_user(db, user_in)
            
        access_token = create_access_token(data={"sub": str(user.id)})
        
        # Onboarding is required if the user has no username set
        onboarding_required = user.username is None
        
        return {
            "access_token": access_token, 
            "token_type": "bearer", 
            "user": UserRead.from_orm(user),
            "onboarding_required": onboarding_required
        }
        
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

@router.patch("/username", response_model=UserRead)
def update_username(
    payload: dict, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    new_username = payload.get("username")
    if not new_username or len(new_username) < 4:
        raise HTTPException(status_code=400, detail="Username must be at least 4 characters")
    
    # Check if username already exists
    from app.models.user import User
    existing = db.query(User).filter(User.username == new_username).first()
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    current_user.username = new_username
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/me", response_model=UserRead)
def me(current_user=Depends(get_current_user)):
    return current_user
