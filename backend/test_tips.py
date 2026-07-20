import asyncio, json, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from dotenv import load_dotenv
load_dotenv()
from groq import AsyncGroq

async def test():
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    model = os.getenv("TIPS_MODEL", "")
    print(f"Model: {model!r}")
    print(f"GROQ_KEY set: {bool(os.getenv('GROQ_API_KEY'))}")

    # Test 1: with response_format json_object
    try:
        r = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": 'Return JSON: {"tips":["a","b","c"]}'}],
            max_tokens=100,
            response_format={"type": "json_object"},
        )
        print("WITH json_object OK:", r.choices[0].message.content)
    except Exception as e:
        print(f"WITH json_object FAIL: {type(e).__name__}: {e}")
        # Test 2: without response_format
        try:
            r2 = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": 'Return JSON only: {"tips":["a","b","c"]}'}],
                max_tokens=100,
            )
            print("WITHOUT response_format OK:", r2.choices[0].message.content)
        except Exception as e2:
            print(f"WITHOUT response_format FAIL: {type(e2).__name__}: {e2}")

asyncio.run(test())
