from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import contains_eager, joinedload

from app.auth import get_current_user, get_optional_user
from app.db import get_db
from app.models import Comment, FavoriteList, ListItem, MovieList, Rating, User
from app.schemas import (
    CommentCreate,
    CommentOut,
    ItemCreate,
    ItemReorder,
    ListCreate,
    ListDetail,
    ListItemOut,
    ListOut,
    ListUpdate,
    RatingRequest,
)

router = APIRouter(prefix="/api/lists", tags=["lists"])


def _list_out(row, avg=0.0, rcount=0, icount=0):
    return ListOut(
        id=row.id,
        user_id=row.user_id,
        title=row.title,
        description=row.description,
        created_at=row.created_at,
        updated_at=row.updated_at,
        creator_name=row.creator.display_name,
        creator_id=row.creator.id,
        avg_rating=float(avg) if avg else 0.0,
        rating_count=rcount,
        item_count=icount,
    )


@router.get("", response_model=list[ListOut])
async def browse_lists(
    q: str = "",
    page: int = 1,
    per_page: int = 20,
    db: AsyncSession = Depends(get_db),
):
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
    )
    if q:
        stmt = stmt.where(MovieList.title.ilike(f"%{q}%"))
    stmt = stmt.group_by(MovieList.id, User.id).order_by(MovieList.updated_at.desc())
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(stmt)
    rows = result.all()

    return [_list_out(r[0], r[1], r[2], r[3]) for r in rows]


@router.post("", response_model=ListOut, status_code=status.HTTP_201_CREATED)
async def create_list(
    body: ListCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ml = MovieList(user_id=user.id, title=body.title, description=body.description)
    db.add(ml)
    await db.commit()
    await db.refresh(ml)
    ml.creator = user
    return _list_out(ml)


@router.get("/{list_id}", response_model=ListDetail)
async def get_list(
    list_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
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
        .where(MovieList.id == list_id)
        .group_by(MovieList.id, User.id)
    )
    result = await db.execute(stmt)
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")

    ml = row[0]
    await db.refresh(ml, ["items"])
    detail = ListDetail(
        id=ml.id,
        user_id=ml.user_id,
        title=ml.title,
        description=ml.description,
        created_at=ml.created_at,
        updated_at=ml.updated_at,
        creator_name=ml.creator.display_name,
        creator_id=ml.creator.id,
        avg_rating=float(row[1]) if row[1] else 0.0,
        rating_count=row[2],
        item_count=row[3],
        items=[ListItemOut.model_validate(i) for i in ml.items],
        is_favorited=False,
    )
    if current_user:
        fav = await db.execute(
            select(FavoriteList).where(
                FavoriteList.list_id == list_id, FavoriteList.user_id == current_user.id
            )
        )
        detail.is_favorited = fav.scalar_one_or_none() is not None
    return detail


@router.put("/{list_id}", response_model=ListOut)
async def update_list(
    list_id: int,
    body: ListUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MovieList).options(contains_eager(MovieList.creator)).join(MovieList.creator).where(MovieList.id == list_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if row.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your list")

    if body.title is not None:
        row.title = body.title
    if body.description is not None:
        row.description = body.description
    row.updated_at = datetime.now()
    await db.commit()
    await db.refresh(row)
    row.creator = user
    return _list_out(row)


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(
    list_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MovieList).where(MovieList.id == list_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if row.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your list")

    await db.delete(row)
    await db.commit()


@router.post("/{list_id}/items", response_model=ListItemOut, status_code=status.HTTP_201_CREATED)
async def add_item(
    list_id: int,
    body: ItemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MovieList).where(MovieList.id == list_id))
    ml = result.scalar_one_or_none()
    if not ml:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if ml.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your list")

    if body.position is None:
        max_pos = await db.execute(
            select(func.coalesce(func.max(ListItem.position), -1)).where(ListItem.list_id == list_id)
        )
        position = max_pos.scalar() + 1
    else:
        position = body.position

    item = ListItem(
        list_id=list_id,
        tmdb_id=body.tmdb_id,
        title=body.title,
        poster_path=body.poster_path,
        release_year=body.release_year,
        position=position,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return ListItemOut.model_validate(item)


@router.put("/{list_id}/items/reorder")
async def reorder_items(
    list_id: int,
    body: ItemReorder,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MovieList).where(MovieList.id == list_id))
    ml = result.scalar_one_or_none()
    if not ml:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if ml.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your list")

    for ip in body.items:
        await db.execute(
            update(ListItem).where(ListItem.id == ip.id, ListItem.list_id == list_id).values(position=ip.position)
        )
    await db.commit()
    return {"ok": True}


@router.delete("/{list_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    list_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MovieList).where(MovieList.id == list_id))
    ml = result.scalar_one_or_none()
    if not ml:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if ml.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your list")

    item_result = await db.execute(
        select(ListItem).where(ListItem.id == item_id, ListItem.list_id == list_id)
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    await db.delete(item)
    await db.commit()


@router.post("/{list_id}/rate", response_model=RatingRequest)
async def rate_list(
    list_id: int,
    body: RatingRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MovieList).where(MovieList.id == list_id))
    ml = result.scalar_one_or_none()
    if not ml:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")

    existing = await db.execute(
        select(Rating).where(Rating.list_id == list_id, Rating.user_id == user.id)
    )
    rating = existing.scalar_one_or_none()
    if rating:
        rating.score = body.score
    else:
        rating = Rating(list_id=list_id, user_id=user.id, score=body.score)
        db.add(rating)

    await db.commit()
    return body


@router.post("/{list_id}/favorite")
async def toggle_favorite(
    list_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MovieList).where(MovieList.id == list_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")

    existing = await db.execute(
        select(FavoriteList).where(
            FavoriteList.list_id == list_id, FavoriteList.user_id == user.id
        )
    )
    fav = existing.scalar_one_or_none()
    if fav:
        await db.delete(fav)
        await db.commit()
        return {"favorited": False}
    db.add(FavoriteList(list_id=list_id, user_id=user.id))
    await db.commit()
    return {"favorited": True}


@router.get("/{list_id}/comments", response_model=list[CommentOut])
async def get_comments(list_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comment)
        .options(joinedload(Comment.user))
        .where(Comment.list_id == list_id)
        .order_by(Comment.created_at.desc())
    )
    rows = result.unique().scalars().all()
    return [
        CommentOut(
            id=r.id,
            list_id=r.list_id,
            user_id=r.user_id,
            body=r.body,
            created_at=r.created_at,
            user_name=r.user.display_name,
        )
        for r in rows
    ]


@router.post("/{list_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    list_id: int,
    body: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MovieList).where(MovieList.id == list_id))
    ml = result.scalar_one_or_none()
    if not ml:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")

    comment = Comment(list_id=list_id, user_id=user.id, body=body.body)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentOut(
        id=comment.id,
        list_id=comment.list_id,
        user_id=comment.user_id,
        body=comment.body,
        created_at=comment.created_at,
        user_name=user.display_name,
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your comment")

    await db.delete(comment)
    await db.commit()
