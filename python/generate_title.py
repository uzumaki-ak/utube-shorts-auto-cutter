import requests
import json
import sys
import os

def generate_with_euri(transcript, api_key):
    """Generate title and hashtags using Euri API"""
    try:
        print("[Euri] Generating title with Euri API...")
        url = "https://api.euron.one/api/v1/euri/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        prompt = f"""
        Based on this video transcript, generate:
        1. A catchy YouTube Shorts title (max 60 characters)
        2. 5-7 relevant hashtags
        3. A brief description (max 150 characters)
        
        Return ONLY JSON format:
        {{
            "title": "catchy title here",
            "hashtags": "#tag1 #tag2 #tag3",
            "description": "brief description here"
        }}
        
        Transcript: {transcript[:2000]}
        """
        
        data = {
            "messages": [{"role": "user", "content": prompt}],
            "model": "gpt-4.1-nano",
            "max_tokens": 500,
            "temperature": 0.7
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            try:
                print("[Euri] Title generation successful")
                return json.loads(content)
            except:
                print("[Euri] JSON parsing failed, using fallback")
                return {
                    "title": "Amazing Live Moment",
                    "hashtags": "#shorts #live #viral #trending #fyp",
                    "description": "Check out this awesome moment from the live stream!"
                }
        else:
            print(f"[Euri] API error: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"[Euri] API failed: {e}")
        return None

def generate_with_gemini(transcript, api_key):
    """Fallback to Gemini API"""
    try:
        print("[Gemini] Trying Gemini API...")
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"Create YouTube Shorts metadata: title (60 chars max), hashtags, brief description. JSON format. Transcript: {transcript[:1500]}"
        response = model.generate_content(prompt)
        
        import re
        json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if json_match:
            print("[Gemini] Title generation successful")
            return json.loads(json_match.group())
        else:
            return None
    except Exception as e:
        print(f"[Gemini] API failed: {e}")
        return None

def generate_metadata(transcript, euri_api_key, gemini_api_key=None):
    """Generate title and metadata with fallbacks"""
    
    # Try Euri API first
    result = generate_with_euri(transcript, euri_api_key)
    if result:
        return result
        
    # Fallback to Gemini
    if gemini_api_key:
        result = generate_with_gemini(transcript, gemini_api_key)
        if result:
            return result
            
    # Final fallback
    print("[Title] Using fallback title")
    return {
        "title": "Live Stream Highlight",
        "hashtags": "#shorts #live #clip #viral #trending",
        "description": "Awesome moment from the live stream! Don't forget to like and subscribe!"
    }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_title.py <transcript> <euri_api_key> [gemini_api_key]")
        sys.exit(1)
        
    transcript = sys.argv[1]
    euri_api_key = sys.argv[2]
    gemini_api_key = sys.argv[3] if len(sys.argv) > 3 else None
    
    result = generate_metadata(transcript, euri_api_key, gemini_api_key)
    print(json.dumps(result, ensure_ascii=False))