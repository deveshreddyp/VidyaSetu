import os
from dotenv import load_dotenv
from llama_index.llms.groq import Groq

load_dotenv()

try:
    print("🧠 Testing Groq (AI Brain)...")
    # UPDATED MODEL NAME BELOW:
    llm = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
    response = llm.complete("Say 'System Operational' if you can hear me.")
    print(f"🤖 AI Says: {response}")
    print("✅ SUCCESS: The Brain is working!")
except Exception as e:
    print(f"❌ ERROR: {e}")