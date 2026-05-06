"""
backend/cache.py — Basit in-memory LRU cache
asyncio lock ile thread-safe
"""
import asyncio
import time
from typing import Any, Optional
from functools import wraps
import hashlib, json

class TTLCache:
    def __init__(self, maxsize=128, ttl=300):
        self._data: dict = {}
        self._times: dict = {}
        self._lock = asyncio.Lock()
        self.maxsize = maxsize
        self.ttl = ttl

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key not in self._data:
                return None
            if time.time() - self._times[key] > self.ttl:
                del self._data[key]
                del self._times[key]
                return None
            return self._data[key]

    async def set(self, key: str, value: Any):
        async with self._lock:
            # LRU: en eski girişi sil
            if len(self._data) >= self.maxsize:
                oldest = min(self._times, key=lambda k: self._times[k])
                del self._data[oldest]
                del self._times[oldest]
            self._data[key] = value
            self._times[key] = time.time()

    async def invalidate(self, prefix: str = ""):
        async with self._lock:
            keys = [k for k in self._data if k.startswith(prefix)]
            for k in keys:
                del self._data[k]
                del self._times[k]

# Singleton cache'ler
district_cache = TTLCache(maxsize=64, ttl=600)   # 10 dk
polygon_cache  = TTLCache(maxsize=32, ttl=600)   # 10 dk
stats_cache    = TTLCache(maxsize=64, ttl=300)    # 5 dk
detail_cache   = TTLCache(maxsize=128, ttl=300)   # 5 dk


def cache_key(*args) -> str:
    return hashlib.md5(json.dumps(args, sort_keys=True).encode()).hexdigest()