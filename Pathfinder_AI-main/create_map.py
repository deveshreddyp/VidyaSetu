import networkx as nx
from pyvis.network import Network
import os
from dotenv import load_dotenv
from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.llms.groq import Groq
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb

# 1. SETUP
load_dotenv()

print("⚙️  Configuring Groq Brain...")
llm = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")

Settings.llm = llm
Settings.embed_model = embed_model

# 2. RECONNECT TO MEMORY
print("🔌 Reconnecting to Local Memory...")
chroma_client = chromadb.PersistentClient(path="./storage_graph/chroma")
chroma_collection = chroma_client.get_or_create_collection("curriculum_db")
vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

storage_context = StorageContext.from_defaults(
    vector_store=vector_store,
    persist_dir="./storage_graph"
)

# 3. LOAD THE BRAIN
print("🗺️  Loading the Index...")
index = load_index_from_storage(storage_context)

# 4. EXTRACT THE GRAPH (FIXED SECTION)
print("🕸️  Extracting connections...")
g = nx.DiGraph()
graph_store = index.graph_store
subj_map = graph_store._data.graph_dict 

count = 0
for subj, connections_list in subj_map.items():
    # The fix: Iterate through the list directly
    for connection in connections_list:
        # Connection is typically [Object, Relation]
        if len(connection) >= 2:
            obj = connection[0]
            relation = connection[1]
            
            g.add_node(subj, color="#97c2fc", title=subj) # Blue for subjects
            g.add_node(obj, color="#ffff00", title=obj)   # Yellow for objects
            g.add_edge(subj, obj, label=relation)
            count += 1

print(f"🔗 Found {count} connections!")

# 5. VISUALIZE
net = Network(height="600px", width="100%", bgcolor="#222222", font_color="white", directed=True)
net.from_nx(g)
net.toggle_physics(True)

output_file = "curriculum_map.html"
net.save_graph(output_file)

print(f"✅ Map generated: {output_file}")