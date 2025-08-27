#!/usr/bin/env python3
"""
Group API Routes
Copyright (C) 2025 wolkstein

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models.user import GroupCreate, GroupResponse, GroupJoin, UserResponse
from services.auth_service import get_current_active_user, get_db
from services.group_service import (
    create_group, join_group, leave_group, get_user_groups, 
    get_group_members, format_group_response
)

router = APIRouter(prefix="/groups", tags=["groups"])

@router.post("/", response_model=GroupResponse)
def create_new_group(
    group_create: GroupCreate, 
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new group"""
    group = create_group(db, group_create, current_user)
    return format_group_response(group)

@router.post("/join", response_model=GroupResponse)  
def join_existing_group(
    group_join: GroupJoin,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Join an existing group by name"""
    group = join_group(db, group_join, current_user)
    return format_group_response(group)

@router.delete("/{group_id}")
def leave_existing_group(
    group_id: int,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Leave a group"""
    leave_group(db, group_id, current_user)
    return {"message": "Successfully left group"}

@router.get("/", response_model=List[GroupResponse])
def get_my_groups(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all groups the current user is a member of"""
    groups = get_user_groups(db, current_user)
    return [format_group_response(group) for group in groups]

@router.get("/{group_id}/members", response_model=List[UserResponse])
def get_group_member_list(
    group_id: int,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get members of a group (only if user is a member)"""
    members = get_group_members(db, group_id, current_user)
    return [
        UserResponse(
            id=member.id,
            username=member.username,
            email=member.email,
            is_active=member.is_active,
            created_at=member.created_at.isoformat()
        ) for member in members
    ]
