from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

# Load the keys
load_dotenv()

uri = os.getenv("NEO4J_URI")
user = os.getenv("NEO4J_USERNAME")
password = os.getenv("NEO4J_PASSWORD")

print(f"🔍 Testing connection to: {uri}")

try:
    # Try to connect
    driver = GraphDatabase.driver(uri, auth=(user, password))
    driver.verify_connectivity()
    print("✅ SUCCESS! Your computer can talk to Neo4j.")
except Exception as e:
    print(f"❌ FAILED. Error details:\n{e}")
finally:
    if 'driver' in locals():
        driver.close()