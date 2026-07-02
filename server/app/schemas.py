from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    email: str
    display_name: str

    model_config = {"from_attributes": True}


class UserDetailOut(UserOut):
    list_count: int = 0
    avg_rating: float = 0.0
    rating_count: int = 0


class MovieSearchResult(BaseModel):
    tmdb_id: int
    title: str
    poster_path: Optional[str] = None
    release_year: Optional[int] = None
    overview: Optional[str] = None


class MovieSearchResponse(BaseModel):
    results: list[MovieSearchResult]


class ListCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""


class ListUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class ListOut(BaseModel):
    id: int
    user_id: int
    creator_id: int = 0
    title: str
    description: str
    created_at: datetime
    updated_at: datetime
    creator_name: str = ""
    avg_rating: float = 0.0
    rating_count: int = 0
    item_count: int = 0

    model_config = {"from_attributes": True}


class ListDetail(ListOut):
    items: list["ListItemOut"] = []
    is_favorited: bool = False

    model_config = {"from_attributes": True}


class ItemCreate(BaseModel):
    tmdb_id: int
    title: str = Field(min_length=1, max_length=255)
    poster_path: Optional[str] = None
    release_year: Optional[int] = None
    position: Optional[int] = None


class ItemReorder(BaseModel):
    items: list["ItemPosition"]


class ItemPosition(BaseModel):
    id: int
    position: int


class ListItemOut(BaseModel):
    id: int
    list_id: int
    tmdb_id: int
    title: str
    poster_path: Optional[str] = None
    release_year: Optional[int] = None
    position: int
    notes: str

    model_config = {"from_attributes": True}


class RatingRequest(BaseModel):
    score: int = Field(ge=1, le=5)


class RatingOut(BaseModel):
    id: int
    list_id: int
    user_id: int
    score: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    id: int
    list_id: int
    user_id: int
    body: str
    created_at: datetime
    user_name: str = ""

    model_config = {"from_attributes": True}
