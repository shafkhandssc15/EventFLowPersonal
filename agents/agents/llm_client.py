"""
Shared High-Availability LLM Client for Autonomous Event Management Agents.
Supports:
1. Primary: Google Gemini 3.8 Flash (via google.genai)
2. Failover: Groq Qwen 3.8 27B / GPT-OSS (via groq)
3. Fallback: OpenAI GPT-4o-mini (via httpx)
4. Cache: In-memory TTL cache to eliminate redundant calls and prevent 429 rate limits
5. Robust JSON Parser with clean markdown stripping
"""

import json
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import httpx
from dotenv import load_dotenv

# Load environment variables
agent_dir = Path(__file__).resolve().parent.parent
load_dotenv(agent_dir / ".env")
load_dotenv(agent_dir.parent / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# In-memory query cache: key -> (timestamp, response_text, engine_name)
_QUERY_CACHE: Dict[str, Tuple[float, str, str]] = {}
CACHE_TTL = 600  # 10 minutes cache


def call_llm(
    prompt: str,
    system_prompt: str = "You are a specialized AI agent in an autonomous Event Management platform. Provide concise, professional, structured outputs.",
    cache_key: Optional[str] = None
) -> Tuple[Optional[str], str]:
    """
    Executes an LLM call with seamless multi-provider failover:
    Gemini -> Groq -> OpenAI -> None
    Returns (raw_response_text, engine_name).
    """
    now = time.time()
    if cache_key and cache_key in _QUERY_CACHE:
        cached_time, cached_res, cached_eng = _QUERY_CACHE[cache_key]
        if now - cached_time < CACHE_TTL:
            return cached_res, f"{cached_eng} (cached)"

    # ── 1. Google Gemini (Primary) ──────────────────────────────────────────
    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            full_prompt = f"{system_prompt}\n\n{prompt}"
            gemini_candidates = [m for m in [GEMINI_MODEL, "gemini-2.5-flash"] if m]
            seen_g = set()
            for m in gemini_candidates:
                if m in seen_g:
                    continue
                seen_g.add(m)
                try:
                    res = client.models.generate_content(model=m, contents=full_prompt)
                    if res and res.text:
                        engine = f"Gemini ({m})"
                        if cache_key:
                            _QUERY_CACHE[cache_key] = (now, res.text, engine)
                        return res.text, engine
                except Exception as m_err:
                    err_s = str(m_err)
                    if "429" in err_s or "quota" in err_s.lower():
                        print(f"[LLM] [WARN] Gemini rate limit hit (429): {err_s[:75]}...")
                        break
                    continue
        except Exception as e:
            print(f"[LLM] [WARN] Gemini call notice: {e}")

    # ── 2. Groq (Automatic Failover) ────────────────────────────────────────
    if GROQ_API_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_API_KEY)
            groq_candidates = [m for m in [GROQ_MODEL, "openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"] if m]
            seen_q = set()
            for m in groq_candidates:
                if m in seen_q:
                    continue
                seen_q.add(m)
                try:
                    chat = client.chat.completions.create(
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        model=m,
                        temperature=0.2,
                    )
                    content = chat.choices[0].message.content
                    if content:
                        engine = f"Groq ({m}) [Failover]"
                        if cache_key:
                            _QUERY_CACHE[cache_key] = (now, content, engine)
                        return content, engine
                except Exception as m_err:
                    err_s = str(m_err)
                    if "429" in err_s or "rate limit" in err_s.lower():
                        print(f"[LLM] [WARN] Groq rate limit hit (429): {err_s[:75]}...")
                        break
                    continue
        except Exception as e:
            print(f"[LLM] [WARN] Groq call notice: {e}")

    # ── 3. OpenAI (Optional Fallback) ───────────────────────────────────────
    if OPENAI_API_KEY:
        try:
            base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
            headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": OPENAI_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
            }
            with httpx.Client(timeout=25.0) as client:
                res = client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    engine = f"OpenAI ({OPENAI_MODEL}) [Failover]"
                    if cache_key:
                        _QUERY_CACHE[cache_key] = (now, content, engine)
                    return content, engine
        except Exception as e:
            print(f"[LLM] [WARN] OpenAI call notice: {e}")

    return None, "Cognitive-Rule-Engine"


def parse_json_from_llm(raw_text: str) -> Optional[Any]:
    """Cleans codeblocks and parses JSON safely."""
    if not raw_text:
        return None
    try:
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"```\s*$", "", cleaned.strip(), flags=re.MULTILINE)

        # Check for JSON object
        s_obj = cleaned.find("{")
        e_obj = cleaned.rfind("}")
        s_arr = cleaned.find("[")
        e_arr = cleaned.rfind("]")

        if s_arr != -1 and (s_obj == -1 or s_arr < s_obj):
            json_str = cleaned[s_arr:e_arr+1]
        elif s_obj != -1:
            json_str = cleaned[s_obj:e_obj+1]
        else:
            json_str = cleaned

        return json.loads(json_str)
    except Exception:
        return None
