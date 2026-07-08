import redis.asyncio as redis
from app.core.config import settings

class RedisClient:
    client: redis.Redis = None

redis_client = RedisClient()

async def connect_to_redis():
    """Create Redis connection"""
    redis_client.client = redis.from_url(settings.REDIS_URL, decode_responses=True)

async def close_redis_connection():
    """Close Redis connection"""
    await redis_client.client.close()

def get_redis():
    return redis_client.client