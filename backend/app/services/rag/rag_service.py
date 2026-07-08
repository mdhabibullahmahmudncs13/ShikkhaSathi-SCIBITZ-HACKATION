"""
RAG (Retrieval-Augmented Generation) Service for ShikkhaSathi
Handles document ingestion, vector storage, and context retrieval for AI tutoring
"""

import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import chromadb
from chromadb.config import Settings

# Optional imports for AI features
try:
    from langchain_ollama import OllamaEmbeddings
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_core.documents import Document
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    OllamaEmbeddings = None
    RecursiveCharacterTextSplitter = None
    Document = None

import PyPDF2
from io import BytesIO

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self, 
                 collection_name: str = "nctb_curriculum",
                 persist_directory: str = "./data/chroma_db",
                 model_name: str = "llama3.2:1b"):
        """
        Initialize RAG service with ChromaDB and Ollama embeddings
        
        Args:
            collection_name: Name of the ChromaDB collection
            persist_directory: Directory to persist the vector database
            model_name: Ollama model name for embeddings
        """
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        self.model_name = model_name
        
        if not LANGCHAIN_AVAILABLE:
            logger.warning("LangChain dependencies not available. RAG service will run in limited mode.")
            self.embeddings = None
            self.text_splitter = None
            return
        
        # Initialize ChromaDB client
        os.makedirs(persist_directory, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=persist_directory)
        
        # Initialize embeddings with Ollama
        self.embeddings = OllamaEmbeddings(model=model_name)
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # Get or create collection
        try:
            self.collection = self.chroma_client.get_collection(name=collection_name)
            logger.info(f"Loaded existing collection: {collection_name}")
        except Exception:
            self.collection = self.chroma_client.create_collection(name=collection_name)
            logger.info(f"Created new collection: {collection_name}")
    
    async def ingest_pdf(self, pdf_path: str, metadata: Dict[str, Any] = None) -> bool:
        """
        Ingest a PDF document into the vector database
        
        Args:
            pdf_path: Path to the PDF file
            metadata: Additional metadata for the document
            
        Returns:
            bool: Success status
        """
        try:
            # Extract text from PDF
            text_content = self._extract_pdf_text(pdf_path)
            if not text_content.strip():
                logger.warning(f"No text extracted from {pdf_path}")
                return False
            
            # Create document with metadata
            doc_metadata = metadata or {}
            doc_metadata.update({
                "source": pdf_path,
                "type": "pdf",
                "filename": Path(pdf_path).name
            })
            
            document = Document(page_content=text_content, metadata=doc_metadata)
            
            # Split document into chunks
            chunks = self.text_splitter.split_documents([document])
            
            # Generate embeddings and store in ChromaDB
            texts = [chunk.page_content for chunk in chunks]
            metadatas = [chunk.metadata for chunk in chunks]
            
            # Generate embeddings using Ollama
            embeddings = await self._generate_embeddings(texts)
            
            # Create unique IDs for chunks
            ids = [f"{Path(pdf_path).stem}_{i}" for i in range(len(chunks))]
            
            # Add to ChromaDB collection
            self.collection.add(
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"Successfully ingested {len(chunks)} chunks from {pdf_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error ingesting PDF {pdf_path}: {str(e)}")
            return False
    
    async def ingest_text(self, text: str, metadata: Dict[str, Any]) -> bool:
        """
        Ingest plain text into the vector database
        
        Args:
            text: Text content to ingest
            metadata: Metadata for the text
            
        Returns:
            bool: Success status
        """
        try:
            document = Document(page_content=text, metadata=metadata)
            chunks = self.text_splitter.split_documents([document])
            
            texts = [chunk.page_content for chunk in chunks]
            metadatas = [chunk.metadata for chunk in chunks]
            
            embeddings = await self._generate_embeddings(texts)
            
            # Generate unique IDs
            base_id = metadata.get('id', 'text')
            ids = [f"{base_id}_{i}" for i in range(len(chunks))]
            
            self.collection.add(
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"Successfully ingested {len(chunks)} text chunks")
            return True
            
        except Exception as e:
            logger.error(f"Error ingesting text: {str(e)}")
            return False
    
    async def search_similar(self, query: str, n_results: int = 5, 
                           subject_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Search for similar documents based on query
        
        Args:
            query: Search query
            n_results: Number of results to return
            subject_filter: Optional subject filter
            
        Returns:
            List of similar documents with metadata
        """
        try:
            # Generate embedding for query (synchronous call)
            query_embedding = self.embeddings.embed_query(query)
            
            # Prepare where clause for filtering
            where_clause = {}
            if subject_filter:
                where_clause["subject"] = subject_filter
            
            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_clause if where_clause else None
            )
            
            # Format results
            formatted_results = []
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    'content': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'distance': results['distances'][0][i] if 'distances' in results else None
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching similar documents: {str(e)}")
            return []
    
    async def get_context_for_query(self, query: str, subject: Optional[str] = None) -> str:
        """
        Get relevant context for a query to use in RAG
        
        Args:
            query: User query
            subject: Optional subject filter
            
        Returns:
            Formatted context string
        """
        similar_docs = await self.search_similar(query, n_results=3, subject_filter=subject)
        
        if not similar_docs:
            return "No relevant context found in the curriculum documents."
        
        context_parts = []
        for i, doc in enumerate(similar_docs, 1):
            source = doc['metadata'].get('filename', 'Unknown source')
            content = doc['content']
            context_parts.append(f"Source {i} ({source}):\n{content}")
        
        return "\n\n".join(context_parts)
    
    def _extract_pdf_text(self, pdf_path: str) -> str:
        """Extract text content from PDF file"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_content = ""
                
                for page in pdf_reader.pages:
                    text_content += page.extract_text() + "\n"
                
                return text_content
                
        except Exception as e:
            logger.error(f"Error extracting text from PDF {pdf_path}: {str(e)}")
            return ""
    
    async def _generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for texts using Ollama"""
        try:
            # Use embed_documents for batch processing
            embeddings = self.embeddings.embed_documents(texts)
            logger.info(f"Generated {len(embeddings)} embeddings with dimension {len(embeddings[0]) if embeddings else 0}")
            return embeddings
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            # Fallback to dummy embeddings for testing
            return [[0.0] * 2048 for _ in texts]  # Match Ollama's dimension
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the collection"""
        try:
            count = self.collection.count()
            return {
                "document_count": count,
                "collection_name": self.collection_name
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            return {"document_count": 0, "collection_name": self.collection_name}
    
    def clear_collection(self) -> bool:
        """Clear all documents from the collection"""
        try:
            # Delete and recreate collection
            self.chroma_client.delete_collection(name=self.collection_name)
            self.collection = self.chroma_client.create_collection(name=self.collection_name)
            logger.info(f"Cleared collection: {self.collection_name}")
            return True
        except Exception as e:
            logger.error(f"Error clearing collection: {str(e)}")
            return False

# Global RAG service instance - initialized lazily
rag_service = None

def get_rag_service():
    """Get or create the RAG service instance"""
    global rag_service
    if rag_service is None:
        try:
            rag_service = RAGService()
        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {e}")
            rag_service = None
    return rag_service