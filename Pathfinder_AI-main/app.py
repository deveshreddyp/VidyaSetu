__import__('pysqlite3')
import sys
sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')

import chainlit as cl
import os
from dotenv import load_dotenv
from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.llms.groq import Groq
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb

# 1. SETUP
load_dotenv()

llm = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")

Settings.llm = llm
Settings.embed_model = embed_model

@cl.on_chat_start
async def start():
    """
    1. Load the Brain.
    2. Send the Map file to the user.
    """
    msg = cl.Message(content="🧠 **Initializing Pathfinder AI...**")
    await msg.send()

    try:
        # --- PART A: LOAD THE BRAIN ---
        chroma_client = chromadb.PersistentClient(path="./storage_graph/chroma")
        chroma_collection = chroma_client.get_or_create_collection("curriculum_db")
        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
        
        storage_context = StorageContext.from_defaults(
            vector_store=vector_store, 
            persist_dir="./storage_graph"
        )
        
        index = load_index_from_storage(storage_context)
        query_engine = index.as_query_engine(include_text=True, response_mode="tree_summarize")
        cl.user_session.set("query_engine", query_engine)

        # --- PART B: SEND THE MAP ---
        # We check if the map file exists and attach it to the message
        elements = []
        if os.path.exists("curriculum_map.html"):
            elements.append(
                cl.File(
                    name="curriculum_map.html",
                    path="./curriculum_map.html",
                    display="inline",
                )
            )
            map_msg = "\n\n🗺️ **I have generated a Learning Map for you.** Click the file below to open the interactive graph!"
        else:
            map_msg = "\n\n(Map file not found. Run create_map.py to generate it!)"

        # Update the welcome message
        msg.content = f"✅ **System Ready!** Ask me anything about the curriculum.{map_msg}"
        msg.elements = elements
        await msg.update()

    except Exception as e:
        msg.content = f"❌ **Error:** {e}"
        await msg.update()

@cl.on_message
async def main(message: cl.Message):
    query_engine = cl.user_session.get("query_engine")
    response_msg = cl.Message(content="Thinking...")
    await response_msg.send()

    response = query_engine.query(message.content)
    
    response_msg.content = str(response)
    await response_msg.update()