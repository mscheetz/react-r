# Movie List Site — Build Plan

## Stack
- **Frontend**: React 19 + Vite 8 + Tailwind v4 + React Router + TanStack React Query
- **Backend**: Python 3.12+ / FastAPI + SQLAlchemy async + asyncpg + Alembic
- **Database**: PostgreSQL
- **Auth**: JWT (python-jose) + bcrypt (passlib)
- **Movies**: TMDB API (httpx)

---

## Phase 1: Backend scaffold

### Restructure server/ into package

```
server/
  main.py                 ← FastAPI app mount
  app/
    __init__.py
    config.py             ← pydantic-settings (DATABASE_URL, JWT_SECRET, TMDB_API_KEY)
    db.py                 ← async engine + session factory
    models.py             ← SQLAlchemy models (5 tables)
    schemas.py            ← Pydantic request/response models
    auth.py               ← JWT create/verify, password hashing, get_current_user dependency
    routes/
      __init__.py
      auth.py
      lists.py
      movies.py
```

### Database tables (all in one Alembic migration)

| Table | Columns |
|---|---|
| `users` | id (PK), email (unique), password_hash, display_name, created_at |
| `lists` | id (PK), user_id (FK→users), title, description, created_at, updated_at |
| `list_items` | id (PK), list_id (FK→lists), tmdb_id, title, poster_path, release_year, position, notes |
| `ratings` | id (PK), list_id (FK→lists), user_id (FK→users), score (1-5), created_at — unique(list_id, user_id) |
| `comments` | id (PK), list_id (FK→lists), user_id (FK→users), body, created_at |

### Dependencies to add to pyproject.toml

```toml
dependencies = [
    "fastapi>=0.138.2",
    "uvicorn>=0.49.0",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.30",
    "alembic>=1.14",
    "python-jose[cryptography]>=3.3",
    "passlib[bcrypt]>=1.7",
    "httpx>=0.28",
    "pydantic-settings>=2.0",
    "pydantic[email]>=2.0",
]
```

### Files to create
- `server/app/__init__.py` — empty
- `server/app/routes/__init__.py` — empty
- `server/app/config.py` — Settings class reading .env
- `server/app/db.py` — engine + async_session + get_db dependency
- `server/app/models.py` — User, MovieList, ListItem, Rating, Comment
- `server/app/schemas.py` — all Pydantic models
- `server/app/auth.py` — hash_password, verify_password, create_token, decode_token, get_current_user

### Files to update
- `server/pyproject.toml` — add all deps
- `server/main.py` — mount routes, lifespan create tables

### Commands
```bash
cd server
uv sync
uv run alembic init -t async app/migrations
uv run alembic revision --autogenerate -m "init"
uv run alembic upgrade head
```

---

## Phase 2: Auth API + Frontend

### Backend
- `POST /api/auth/register` — validate, hash password, create user, return JWT + user
- `POST /api/auth/login` — verify credentials, return JWT + user
- `GET /api/auth/me` — return current user from token

### Frontend
- Install `react-router-dom`, `@tanstack/react-query`, `axios`
- Create `client/src/lib/api.js` — axios instance with Bearer token interceptor
- Create `client/src/lib/auth.jsx` — AuthContext with login, register, logout, user state
- Create `client/src/pages/Login.jsx` — email + password form
- Create `client/src/pages/Register.jsx` — email + password + display name form
- Create `client/src/components/Navbar.jsx` — logo, nav links, login/logout button
- Update `App.jsx` — BrowserRouter, AuthProvider, routes
- Update `main.jsx` — QueryClientProvider

---

## Phase 3: TMDB integration

### Backend
- `GET /api/movies/search?q=` — proxy to `search/movie` TMDB endpoint, return id, title, poster_path, release_date, overview
- `GET /api/movies/{tmdb_id}` — proxy to `movie/{tmdb_id}` TMDB endpoint

### Frontend
- `client/src/components/MovieSearchInput.jsx` — debounced input, fetch from `/api/movies/search`, show dropdown with poster thumbnails
- Used when adding movies to a list

---

## Phase 4: Lists CRUD

### Backend
- `GET /api/lists` — browse lists: paginated, with creator_name, avg_rating, rating_count, item_count
- `POST /api/lists` — create list (title, description) — requires auth
- `GET /api/lists/{id}` — full detail with items ordered by position
- `PUT /api/lists/{id}` — update title/description — owner only
- `DELETE /api/lists/{id}` — delete list + cascade items/ratings/comments — owner only

### Frontend
- `client/src/pages/Home.jsx` — grid of ListCards, search/filter by title
- `client/src/pages/CreateList.jsx` — form (title, description), then add movies via MovieSearchInput
- `client/src/pages/ListDetail.jsx` — list info, movie grid, rating, comments
- `client/src/components/ListCard.jsx` — preview card (title, creator, avg rating, item count)

---

## Phase 5: List Items

### Backend
- `POST /api/lists/{id}/items` — add movie (tmdb_id, title, poster_path, release_year, optional position)
- `PUT /api/lists/{id}/items/reorder` — bulk update item positions
- `DELETE /api/lists/{id}/items/{item_id}` — remove item — owner only

### Frontend
- Movie card display in list (poster, title, year, remove button)
- Drag-to-reorder (native drag and drop, no library)
- Add movie via MovieSearchInput

---

## Phase 6: Ratings

### Backend
- `POST /api/lists/{id}/rate` — upsert rating (score 1-5) — requires auth
- Rating average is computed in the `/api/lists` and `/api/lists/{id}` queries

### Frontend
- `client/src/components/StarRating.jsx` — clickable stars (filled/empty), displays current user's rating + average

---

## Phase 7: Comments

### Backend
- `GET /api/lists/{id}/comments` — return comments with user_name, ordered by created_at desc
- `POST /api/lists/{id}/comments` — add comment — requires auth
- `DELETE /api/comments/{id}` — delete own comment

### Frontend
- `client/src/components/CommentSection.jsx` — list of comments + add comment form

---

## Phase 8: Frontend polish

- Loading skeletons (while data fetches)
- Error toasts for failed API calls
- Empty states ("No lists yet. Create one!")
- Responsive grid: 1 col mobile, 2-3 cols desktop
- 404 page for invalid list IDs

---

## Phase 9: Edit list page

- `client/src/pages/EditList.jsx` — edit title/description, add/remove/reorder movies
- Reuses MovieSearchInput and drag-to-reorder from Phase 5

---

## Ready script (after all phases)

```bash
# From repo root
cd server && uv sync && uv run alembic upgrade head && cd ..
cd client && npm install && cd ..
npm run dev
```