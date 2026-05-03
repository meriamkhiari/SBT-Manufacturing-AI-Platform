#!/usr/bin/env python3
"""Test rapide de la clé Gemini API"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_KEY = os.getenv("GEMINI_KEY")

if not GEMINI_KEY:
    print("❌ GEMINI_KEY not found in .env")
    exit(1)

print(f"✓ Testing key: {GEMINI_KEY[:20]}...")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_KEY}"

payload = {
    "contents": [{
        "parts": [{"text": "Say 'Hello' in one word"}]
    }],
    "generationConfig": {
        "temperature": 0.1,
        "maxOutputTokens": 10
    }
}

try:
    r = requests.post(url, json=payload, timeout=10)
    
    if r.status_code == 200:
        print("✅ SUCCESS! Key is working!")
        print(f"Response: {r.json()}")
    elif r.status_code == 429:
        print("❌ RATE LIMIT! Quota exceeded.")
        print(f"Error: {r.json()}")
    else:
        print(f"❌ ERROR {r.status_code}")
        print(f"Response: {r.text[:500]}")
        
except Exception as e:
    print(f"❌ Exception: {e}")
