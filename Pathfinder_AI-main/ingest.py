import os
from dotenv import load_dotenv
import logging
import sys

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO)

from llama_index.core import SimpleDirectoryReader, KnowledgeGraphIndex, Settings
from llama_index.core import StorageContext
from llama_index.llms.groq import Groq
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.graph_stores.neo4j import Neo4jGraphStore

# 1. SETUP THE BRAIN (LLM) & EMBEDDINGS
print("🚀 Setting up Groq and Embeddings...")
llm = Groq(model="llama3-70b-8192", api_key=os.getenv("GROQ_API_KEY"))
embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")

Settings.llm = llm
Settings.embed_model = embed_model
Settings.chunk_size = 512

# 2. CONNECT TO NEO4J
print("🔌 Connecting to Neo4j...")
graph_store = Neo4jGraphStore(
    username=os.getenv("NEO4J_USERNAME"),
    password=os.getenv("NEO4J_PASSWORD"),
    url=os.getenv("NEO4J_URI"),
)

storage_context = StorageContext.from_defaults(graph_store=graph_store)

# 3. LOAD DATA
print("📚 Loading curriculum data...")
# Ensure you have data/curriculum.txt created!
documents = SimpleDirectoryReader("./data").load_data()

# 4. BUILD THE GRAPH
print("🧠 Building the Knowledge Graph... (This might take a minute)")
index = KnowledgeGraphIndex.from_documents(
    documents,
    storage_context=storage_context,
    max_triplets_per_chunk=2,
    include_embeddings=True,
)

print("✅ DONE! The curriculum has been ingested into the Graph Database.")