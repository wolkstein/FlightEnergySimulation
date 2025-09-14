#!/usr/bin/env python3
"""
Elevation Settings Routes - API endpoints for user elevation settings
Copyright (C) 2025 wolkstein
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from models.database import SessionLocal
from models.user import User, ElevationSettings, ElevationSettingsUpdate

# Import auth service - use SAME auth as sessions
from services.auth_service import get_current_active_user

router = APIRouter(prefix="/api/elevation", tags=["elevation"])

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# User Elevation Settings Endpoints
@router.get("/settings", response_model=ElevationSettings)
async def get_user_elevation_settings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's elevation settings"""
    try:
        # Get user from current session by ID
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        print(f"🔍 DEBUG: User {user.username} elevation_settings: {user.elevation_settings}")
        
        if user.elevation_settings:
            print(f"✅ Returning user settings: {user.elevation_settings}")
            return ElevationSettings(**user.elevation_settings)
        else:
            print("⚠️ No user settings found, returning defaults")
            # Return defaults if no settings exist
            return ElevationSettings()
            
    except Exception as e:
        print(f"❌ Error in get_user_elevation_settings: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading settings: {str(e)}")

@router.put("/settings", response_model=ElevationSettings)
async def update_user_elevation_settings(
    settings_update: ElevationSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's elevation settings"""
    try:
        print(f"🔄 DEBUG: PUT request - updating settings: {settings_update}")
        
        # Get user from current session by ID  
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        print(f"🔍 DEBUG: User {user.username} current settings: {user.elevation_settings}")
            
        # Get current settings or defaults
        current_settings = user.elevation_settings or {}
        
        # Update only provided fields
        if settings_update.opentopo_server is not None:
            current_settings["opentopo_server"] = settings_update.opentopo_server
        if settings_update.dataset is not None:
            current_settings["dataset"] = settings_update.dataset  
        if settings_update.safety_margin_m is not None:
            current_settings["safety_margin_m"] = settings_update.safety_margin_m
            
        print(f"💾 DEBUG: Saving new settings: {current_settings}")
            
        # Save to database
        user.elevation_settings = current_settings
        db.commit()
        
        # Force complete reload from database (avoid SQLAlchemy cache)
        user_id = user.id
        db.expunge(user)  # Remove from session
        user = db.query(User).filter(User.id == user_id).first()  # Fresh load
        
        print(f"✅ DEBUG: Settings saved successfully. Verification: {user.elevation_settings}")
        
        return ElevationSettings(**current_settings)
        
    except Exception as e:
        print(f"❌ Error in update_user_elevation_settings: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")