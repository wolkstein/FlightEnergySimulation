#!/usr/bin/env python3
"""
Group Service - Simple group management for session sharing
Copyright (C) 2025 wolkstein

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.user import User, UserGroup, GroupCreate, GroupResponse, GroupJoin

def create_group(db: Session, group_create: GroupCreate, owner: User) -> UserGroup:
    """Create a new group"""
    # Check if group name already exists
    existing_group = db.query(UserGroup).filter(UserGroup.name == group_create.name).first()
    if existing_group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group name already exists"
        )
    
    db_group = UserGroup(
        name=group_create.name,
        description=group_create.description,
        owner_id=owner.id
    )
    
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # Add owner as member
    db_group.members.append(owner)
    db.commit()
    
    return db_group

def join_group(db: Session, group_join: GroupJoin, user: User) -> UserGroup:
    """Join an existing group"""
    group = db.query(UserGroup).filter(UserGroup.name == group_join.group_name).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if already a member
    if user in group.members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member of this group"
        )
    
    group.members.append(user)
    db.commit()
    return group

def leave_group(db: Session, group_id: int, user: User) -> bool:
    """Leave a group"""
    group = db.query(UserGroup).filter(UserGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Owner cannot leave their own group
    if group.owner_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group owner cannot leave group. Delete the group instead."
        )
    
    if user not in group.members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not a member of this group"
        )
    
    group.members.remove(user)
    db.commit()
    return True

def get_user_groups(db: Session, user: User) -> List[UserGroup]:
    """Get all groups the user is a member of"""
    return user.groups

def get_group_members(db: Session, group_id: int, user: User) -> List[User]:
    """Get all members of a group (only if user is a member)"""
    group = db.query(UserGroup).filter(UserGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if user not in group.members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group"
        )
    
    return group.members

def can_access_session(db: Session, session_id: int, user: User) -> bool:
    """Check if user can access a session (owner or group member with access)"""
    from models.database import SimulationSession
    
    session = db.query(SimulationSession).filter(SimulationSession.id == session_id).first()
    if not session:
        return False
    
    # Session owner can always access
    if session.owner_id == user.id:
        return True
    
    # Check if user is in same group as session owner
    if session.owner:
        for group in session.owner.groups:
            if user in group.members:
                return True
    
    return False

def format_group_response(group: UserGroup) -> GroupResponse:
    """Format group for API response"""
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        owner_id=group.owner_id,
        owner_username=group.owner.username,
        member_count=len(group.members),
        created_at=group.created_at.isoformat()
    )
