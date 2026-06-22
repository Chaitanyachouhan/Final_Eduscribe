from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

print("API KEY:", api_key[:10], "...")  # just to confirm it's loaded

client = Groq(api_key=api_key)

try:
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "user", "content": "Say hello in one sentence"}
        ]
    )

    print("\n✅ API WORKING!")
    print("Response:", response.choices[0].message.content)

except Exception as e:
    print("\n❌ ERROR:")
    print(e)