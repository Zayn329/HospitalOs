import os
import time
import httpx
import threading
from collections import deque

# Thread-safe rate limiter (sliding window)
class LLMRateLimiter:
    def __init__(self, max_requests: int = 25, period: int = 60):
        self.max_requests = max_requests
        self.period = period
        self.requests = deque()
        self.lock = threading.Lock()

    def allow_request(self) -> bool:
        with self.lock:
            now = time.time()
            # Evict timestamps older than 60 seconds
            while self.requests and self.requests[0] < now - self.period:
                self.requests.popleft()
            
            if len(self.requests) >= self.max_requests:
                return False
            
            self.requests.append(now)
            return True

rate_limiter = LLMRateLimiter(max_requests=25, period=60)

def call_llm(system_prompt: str, user_prompt: str = "", temperature: float = 0.2) -> str:
    # 1. Enforce Rate Limiting
    if not rate_limiter.allow_request():
        raise Exception("LLM Rate limit exceeded (Max 25 requests per minute). Falling back to local logic.")

    # 2. Get Groq API Key
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise Exception("GROQ_API_KEY environment variable is not set. Falling back to local logic.")

    # 3. Call Groq API
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json"
    }
    
    messages = [{"role": "system", "content": system_prompt}]
    if user_prompt:
        messages.append({"role": "user", "content": user_prompt})

    payload = {
        "model": "openai/gpt-oss-20b",
        "messages": messages,
        "temperature": temperature
    }

    try:
        with httpx.Client(timeout=8.0) as client:
            response = client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            else:
                error_msg = f"Groq API returned status code {response.status_code}: {response.text}"
                raise Exception(error_msg)
    except Exception as e:
        raise Exception(f"Failed to query Groq LLM: {e}")
