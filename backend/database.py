import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

_pool = None

async def init_pool():
    global _pool
    _pool = await asyncpg.create_pool(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        database=os.getenv("DB_NAME", "yenilenebilir"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASS", "1234"),
        min_size=2,
        max_size=10,
    )

async def close_pool():
    global _pool
    if _pool:
        await _pool.close()

def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool başlatılmamış — init_pool() çağrılmadı.")
    return _pool