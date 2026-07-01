from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    postgres_connection_string: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/react-r"
    jwt_secret: str = "change-me"
    tmdb_api_key: str = ""
    tmdb_base_url: str = "https://api.themoviedb.org/3"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
