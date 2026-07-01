from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import contains_eager, joinedload

from app.auth import get_current_user
from app.db import get_db
from app.models import ListItem, MovieList, Rating, User
from app.schemas import ListOut, UserDetailOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/{user_id}", response_model=UserDetailOut)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    list_result = await db.execute(
        select(
            func.count(MovieList.id).label("list_count"),
            func.coalesce(func.avg(Rating.score), 0).label("avg_rating"),
            func.count(Rating.id).label("rating_count"),
        )
        .outerjoin(Rating, Rating.list_id == MovieList.id)
        .where(MovieList.user_id == user_id)
    )
    stats = list_result.one()

    return UserDetailOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        list_count=stats[0],
        avg_rating=float(stats[1]) if stats[1] else 0.0,
        rating_count=stats[2],
    )


@router.get("/{user_id}/lists", response_model=list[ListOut])
async def get_user_lists(
    user_id: int,
    page: int = 1,
    per_page: int = 20,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    stmt = (
        select(MovieList)
        .options(contains_eager(MovieList.creator))
        .join(MovieList.creator)
        .outerjoin(Rating, Rating.list_id == MovieList.id)
        .outerjoin(ListItem, ListItem.list_id == MovieList.id)
        .add_columns(
            func.coalesce(func.avg(Rating.score), 0).label("avg_rating"),
            func.count(Rating.id).label("rating_count"),
            func.count(ListItem.id).label("item_count"),
        )
        .where(MovieList.user_id == user_id)
        .group_by(MovieList.id, User.id)
        .order_by(MovieList.updated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    rows = (await db.execute(stmt)).all()
    return [
        ListOut(
            id=r[0].id,
            user_id=r[0].user_id,
            title=r[0].title,
            description=r[0].description,
            created_at=r[0].created_at,
            updated_at=r[0].updated_at,
            creator_name=r[0].creator.display_name,
            avg_rating=float(r[1]) if r[1] else 0.0,
            rating_count=r[2],
            item_count=r[3],
        )
        for r in rows
    ]