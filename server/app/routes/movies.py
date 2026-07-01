from typing import Optional

from fastapi import APIRouter, HTTPException
from httpx import AsyncClient

from app.config import settings
from app.schemas import MovieSearchResult

router = APIRouter(prefix="/api/movies", tags=["movies"])


@router.get("/search", response_model=list[MovieSearchResult])
async def search_movies(q: str, page: int = 1):
    if not settings.tmdb_api_key:
        raise HTTPException(status_code=400, detail="TMDB_API_KEY not configured")

    async with AsyncClient() as client:
        resp = await client.get(
            f"{settings.tmdb_base_url}/search/movie",
            params={"api_key": settings.tmdb_api_key, "query": q, "page": page, "language": "en-US"},
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for r in data.get("results", [])[:10]:
        year = None
        if r.get("release_date"):
            year = int(r["release_date"][:4])
        results.append(
            MovieSearchResult(
                tmdb_id=r["id"],
                title=r["title"],
                poster_path=r.get("poster_path"),
                release_year=year,
                overview=r.get("overview"),
            )
        )
    return results


@router.get("/{tmdb_id}", response_model=MovieSearchResult)
async def get_movie(tmdb_id: int):
    if not settings.tmdb_api_key:
        raise HTTPException(status_code=400, detail="TMDB_API_KEY not configured")

    async with AsyncClient() as client:
        resp = await client.get(
            f"{settings.tmdb_base_url}/movie/{tmdb_id}",
            params={"api_key": settings.tmdb_api_key, "language": "en-US"},
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Movie not found")
        resp.raise_for_status()
        r = resp.json()

    year = None
    if r.get("release_date"):
        year = int(r["release_date"][:4])

    return MovieSearchResult(
        tmdb_id=r["id"],
        title=r["title"],
        poster_path=r.get("poster_path"),
        release_year=year,
        overview=r.get("overview"),
    )
