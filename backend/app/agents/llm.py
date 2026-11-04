"""Единая фабрика ChatOpenAI: таймаут, повторы и общий лимит частоты запросов"""
import os

from langchain_core.rate_limiters import InMemoryRateLimiter
from langchain_openai import ChatOpenAI

# Без таймаута зависший запрос ждёт вечно, поэтому ограничиваем каждый вызов
LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "60"))
LLM_MAX_RETRIES = int(os.getenv("LLM_MAX_RETRIES", "1"))
# Бесплатный тариф OpenRouter - около 20 запросов в минуту
LLM_REQUESTS_PER_SECOND = float(os.getenv("LLM_REQUESTS_PER_SECOND", "0.3"))

# Один лимитер на все агенты, иначе параллельные генерации складывают запросы
_rate_limiter = InMemoryRateLimiter(
    requests_per_second=LLM_REQUESTS_PER_SECOND,
    max_bucket_size=3,
)


def make_llm(model_name: str, temperature: float) -> ChatOpenAI:
    return ChatOpenAI(
        model=model_name,
        temperature=temperature,
        request_timeout=LLM_TIMEOUT_SECONDS,
        max_retries=LLM_MAX_RETRIES,
        rate_limiter=_rate_limiter,
    )
