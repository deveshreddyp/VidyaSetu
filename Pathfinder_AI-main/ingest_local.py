import os
from dotenv import load_dotenv
import logging
import sys
import shutil

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO)

from llama_index.core import SimpleDirectoryReader, KnowledgeGraphIndex, Settings, StorageContext
from llama_index.llms.groq import Groq
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb

# 1. CLEANUP (Optional: delete old memory if it exists)
if os.path.exists("./storage_graph"):
    shutil.rmtree("./storage_graph")

# 2. SETUP THE BRAIN (LLM)
print("🚀 Setting up Local Brain...")
llm = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")

Settings.llm = llm
Settings.embed_model = embed_model
Settings.chunk_size = 512

# 3. SETUP LOCAL STORAGE (ChromaDB + Simple Graph)
print("💾 Setting up Local Storage...")
# ChromaDB is for Vector Search (Similarity)
chroma_client = chromadb.PersistentClient(path="./storage_graph/chroma")
chroma_collection = chroma_client.get_or_create_collection("curriculum_db")
vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

# We use the default SimpleGraphStore for the graph (saves to JSON automatically)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

# 4. LOAD DATA
print("📚 Loading curriculum data...")
documents = SimpleDirectoryReader("./data").load_data()

# 5. BUILD THE LOCAL GRAPH
print("🧠 Building the Knowledge Graph locally... (This creates the 'storage_graph' folder)")
index = KnowledgeGraphIndex.from_documents(
    documents,
    storage_context=storage_context,
    max_triplets_per_chunk=2,
    include_embeddings=True,
)

# 6. SAVE EVERYTHING TO DISK
print("💾 Saving brain to disk...")
index.storage_context.persist(persist_dir="./storage_graph")

print("✅ DONE! Your AI Brain is now saved in the 'storage_graph' folder.")