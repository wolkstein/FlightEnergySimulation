#!/usr/bin/env python3
"""
Elevation Settings Routes - API endpoints for user elevation settings
Copyright (C) 2025 wolkstein
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from models.database import SessionLocal
from models.user import User, ElevationSettings, ElevationSettingsUpdate

# Import auth service - REQUIRED for user settings
try:
    from services.auth_service import get_current_user
    print("✅ Auth service imported successfully")
except ImportError as e:
    print(f"❌ Auth service import failed: {e}")
    # Temporary fallback
    def get_current_user():
        return None

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
    db: Session = Depends(get_db)
):
    """Get current user's elevation settings"""
    try:
        # Temporarily return defaults while debugging auth
        default_settings = ElevationSettings()
        return default_settings
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading settings: {str(e)}")

@router.put("/settings", response_model=ElevationSettings)
async def update_user_elevation_settings(
    settings_update: ElevationSettingsUpdate,
    db: Session = Depends(get_db)
):
    """Update current user's elevation settings"""
    try:
        # Temporarily just echo back the update while debugging
        updated_settings = {
            "opentopo_server": settings_update.opentopo_server or "192.168.71.250:5000",
            "dataset": settings_update.dataset or "eudem25m",
            "safety_margin_m": settings_update.safety_margin_m or 30
        }
        
        return ElevationSettings(**updated_settings)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")