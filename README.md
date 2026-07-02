# React-r Movie Lists

React + FastAPI + PostgreSQL movie list site. TMDB-powered movie search, user auth, ratings, comments, favorites.

## Stack

- **Frontend**: React 19, Vite 8, Tailwind v4, React Router, TanStack Query
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy (async), asyncpg, Alembic
- **Database**: PostgreSQL
- **Auth**: JWT (python-jose), bcrypt
- **Movies**: TMDB API

## Setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL running locally
- TMDB API key (free: https://themoviedb.org/settings/api)

### 1. Backend

```bash
cd server
cp .sample.env .env
# Edit .env: add TMDB_API_KEY, set JWT_SECRET, confirm POSTGRES_CONNECTION_STRING
uv sync
uv run alembic upgrade head
uv run uvicorn main:app --reload --port 8000
```

JWT Secret:
```
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

### 3. Both at once

```bash
npm run dev   # runs client + server via concurrently
```

## Adding a new database table

1. Add the model class to `server/app/models.py`
2. Generate migration:
   ```bash
   cd server
   uv run alembic revision --autogenerate -m "describe your change"
   ```
3. Apply migration:
   ```bash
   uv run alembic upgrade head
   ```

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in, returns JWT |
| GET | `/api/auth/me` | Yes | Current user |

### Movies
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/movies/search?q=` | Yes | TMDB search |
| GET | `/api/movies/{tmdb_id}` | Yes | TMDB movie detail |

### Lists
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lists` | No | Browse lists (paginated) |
| POST | `/api/lists` | Yes | Create list |
| GET | `/api/lists/{id}` | No | List detail (items, rating, is_favorited) |
| PUT | `/api/lists/{id}` | Yes | Edit list (owner) |
| DELETE | `/api/lists/{id}` | Yes | Delete list (owner) |

### List Items
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/lists/{id}/items` | Yes | Add movie |
| PUT | `/api/lists/{id}/items/reorder` | Yes | Bulk reorder |
| DELETE | `/api/lists/{id}/items/{item_id}` | Yes | Remove item |

### Ratings
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/lists/{id}/rate` | Yes | Rate 1-5 (upsert) |

### Favorites
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/lists/{id}/favorite` | Yes | Toggle favorite |

### Comments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lists/{id}/comments` | No | List comments |
| POST | `/api/lists/{id}/comments` | Yes | Add comment |
| DELETE | `/api/lists/comments/{id}` | Yes | Delete own comment |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/{id}` | No | User info + stats (list_count, avg_rating) |
| GET | `/api/users/{id}/lists` | No | User's lists (paginated) |

## Project structure

```
server/
  main.py                 # FastAPI app
  app/
    config.py             # Env settings
    db.py                 # Async engine + session
    models.py             # SQLAlchemy models
    schemas.py            # Pydantic request/response
    auth.py               # JWT + password + dependencies
    routes/
      auth.py             # Register/login/me
      lists.py            # CRUD + items + ratings + favorites + comments
      movies.py           # TMDB proxy
      users.py            # User info + lists

client/
  src/
    App.jsx               # Routes
    main.jsx              # Entry point (providers)
    lib/
      api.js              # Axios instance + interceptors
      auth.jsx            # Auth context + hooks
    components/
      Navbar.jsx          # Top nav with auth state
      MovieSearchInput.jsx # TMDB autocomplete
      StarRating.jsx       # 5-star widget
      CommentSection.jsx   # Comment list + form
    pages/
      Home.jsx            # Browse all lists
      Login.jsx           # Sign in form
      Register.jsx        # Create account form
      CreateList.jsx       # Create/edit list + manage movies
      ListDetail.jsx       # View list, rate, comment, favorite
      UserDetail.jsx       # User profile + their lists
      NotFound.jsx         # 404
```
