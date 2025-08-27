#!/usr/bin/env python3
"""
User Models - Simple authentication and group management
Copyright (C) 2025 wolkstein

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional, List
from .database import Base

# Association table for many-to-many relationship between users and groups
user_group_association = Table(
    'user_group_members',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('group_id', Integer, ForeignKey('user_groups.id'), primary_key=True)
)

class User(Base):
    """User model for simple authentication"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    owned_sessions = relationship("SimulationSession", back_populates="owner")
    owned_groups = relationship("UserGroup", back_populates="owner")
    groups = relationship("UserGroup", secondary=user_group_association, back_populates="members")

class UserGroup(Base):
    """Simple groups for session sharing"""
    __tablename__ = "user_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="owned_groups")
    members = relationship("User", secondary=user_group_association, back_populates="groups")

# Pydantic models for API
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: str
    
    class Config:
        from_attributes = True

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    owner_username: str
    member_count: int
    created_at: str
    
    class Config:
        from_attributes = True

class GroupJoin(BaseModel):
    group_name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
