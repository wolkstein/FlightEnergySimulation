#!/usr/bin/env python3
"""
Authentication Service - Simple JWT-based authentication
Copyright (C) 2025 wolkstein

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
"""

from datetime import datetime, timedelta
from typing import Optional
import hashlib
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models.database import SessionLocal
from models.user import User, UserCreate, UserLogin

# Configuration
SECRET_KEY = "your-secret-key-here-change-in-production"  # Change this in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24  # 30 days for simplicity

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer for token authentication
security = HTTPBearer()

def get_db():
    """Database dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate user with client-hashed password"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    
    # Direct hash comparison - password is already hashed by client
    if user.hashed_password == password:
        return user
    
    return None

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username"""
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user_create: UserCreate) -> User:
    """Create new user with client-hashed password"""
    # Check if username or email already exists
    if get_user_by_username(db, user_create.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    if get_user_by_email(db, user_create.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Store the client hash directly (password is already hashed by client)
    db_user = User(
        username=user_create.username,
        email=user_create.email,
        hashed_password=user_create.password  # This is already hashed by client
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def generate_client_password_hash(password: str, username: str) -> str:
    """Generate the same hash as the frontend for client-hashed passwords"""
    # Use username as salt (same logic as frontend)
    salt = hashlib.sha256(username.lower().encode()).hexdigest()
    # Combine password with salt and hash
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return password_hash

def authenticate_user_with_client_hash(db: Session, username: str, client_hashed_password: str) -> Optional[User]:
    """Authenticate user with client-hashed password"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    
    # Generate expected client hash from stored password
    # Since we still store bcrypt hashes, we need to check if the user has a client hash stored
    # For now, we'll verify against the stored bcrypt hash by comparing the client hash
    
    # If user was created with client hash, we need to check differently
    # For backward compatibility and new users, we'll store both
    if hasattr(user, 'client_password_hash') and user.client_password_hash:
        # Compare client hashes directly
        return user if user.client_password_hash == client_hashed_password else None
    else:
        # Legacy user - we can't authenticate with client hash without knowing original password
        # This is a limitation we need to handle during migration
        return None

def create_user_with_client_hash(db: Session, user_create: UserCreate) -> User:
    """Create new user with client-hashed password (password field contains the client hash)"""
    # Check if username or email already exists
    if get_user_by_username(db, user_create.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    if get_user_by_email(db, user_create.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Store the client hash as provided (already hashed on client)
    # Also create a server-side hash for additional security
    server_side_hash = get_password_hash(user_create.password)
    
    db_user = User(
        username=user_create.username,
        email=user_create.email,
        hashed_password=server_side_hash,
        # We need to add this field to the User model
        # client_password_hash=user_create.password  # This is already the client hash
    )
    
    # For now, we'll store the client hash in the hashed_password field
    # This is a simplified approach - in production you'd want separate fields
    db_user.hashed_password = user_create.password  # Store client hash directly
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_username(db, username)
    if user is None:
        raise credentials_exception
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
