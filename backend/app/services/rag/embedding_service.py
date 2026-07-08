"""
Embedding Generation Service using OpenAI
Handles text embedding generation and vector database operations
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time
import hashlib
import json

import openai
import pinecone
import tiktoken
from pydantic import BaseModel

from .document_processor import ProcessedChunk

logger = logging.getLogger(__name__)

class EmbeddingConfig(BaseModel):
    """Configuration for embedding service"""
    openai_api_key: str
    pinecone_api_key: str
    pinecone_environment: str = "us-west1-gcp-free"
    embedding_model: str = "text-embedding-3-large"
    embedding_dimensions: int = 1536
    index_name: str = "shikkhasathi-nctb"
    batch_size: int = 100
    max_tokens_per_chunk: int = 8000

class VectorMetadata(BaseModel):
    """Metadata structure for vector storage"""
    content_id: str
    subject: str
    grade: int
    chapter: Optional[int] = None
    topic: Optional[str] = None
    language: str
    page_number: Optional[int] = None
    textbook_name: Optional[str] = None
    source_file: str
    chunk_index: int
    text_length: int
    created_at: str

class EmbeddingService:
    """Service for generating embeddings and managing vector database"""
    
    def __init__(self, config: EmbeddingConfig):
        self.config = config
        self.openai_client = openai.OpenAI(api_key=config.openai_api_key)
        
        # Initialize Pinecone
        pinecone.init(
            api_key=config.pinecone_api_key,
            environment=config.pinecone_environment
        )
        
        # Initialize tokenizer for token counting
        self.tokenizer = tiktoken.encoding_for_model("gpt-3.5-turbo")
        
        # Thread pool for concurrent processing
        self.executor = ThreadPoolExecutor(max_workers=5)
        
        # Initialize index
        self._initialize_index()
    
    def _initialize_index(self):
        """Initialize or connect to Pinecone index"""
        try:
            # Check if index exists
            existing_indexes = pinecone.list_indexes()
            
            if self.config.index_name not in existing_indexes:
                logger.info(f"Creating new Pinecone index: {self.config.index_name}")
                
                # Create index
                pinecone.create_index(
                    name=self.config.index_name,
                    dimension=self.config.embedding_dimensions,
                    metric="cosine"
                )
                
                # Wait for index to be ready
                time.sleep(10)
            
            # Connect to index
            self.index = pinecone.Index(self.config.index_name)
            logger.info(f"Connected to Pinecone index: {self.config.index_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone index: {e}")
            raise
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken"""
        try:
            return len(self.tokenizer.encode(text))
        except Exception as e:
            logger.warning(f"Token counting failed: {e}")
            return len(text.split())  # Fallback to word count
    
    def generate_content_id(self, chunk: ProcessedChunk) -> str:
        """Generate unique content ID for chunk"""
        content = f"{chunk.metadata.source_file}_{chunk.metadata.page_number}_{chunk.metadata.chunk_index}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def prepare_text_for_embedding(self, text: str) -> str:
        """Prepare text for embedding generation"""
        # Remove excessive whitespace
        text = " ".join(text.split())
        
        # Truncate if too long
        token_count = self.count_tokens(text)
        if token_count > self.config.max_tokens_per_chunk:
            # Truncate to fit within token limit
            tokens = self.tokenizer.encode(text)
            truncated_tokens = tokens[:self.config.max_tokens_per_chunk]
            text = self.tokenizer.decode(truncated_tokens)
            logger.warning(f"Text truncated from {token_count} to {len(truncated_tokens)} tokens")
        
        return text
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        try:
            prepared_text = self.prepare_text_for_embedding(text)
            
            response = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.openai_client.embeddings.create(
                    input=prepared_text,
                    model=self.config.embedding_model
                )
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batch
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        try:
            # Prepare texts
            prepared_texts = [self.prepare_text_for_embedding(text) for text in texts]
            
            # Generate embeddings in batch
            response = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.openai_client.embeddings.create(
                    input=prepared_texts,
                    model=self.config.embedding_model
                )
            )
            
            return [item.embedding for item in response.data]
            
        except Exception as e:
            logger.error(f"Batch embedding generation failed: {e}")
            raise
    
    def create_namespace(self, subject: str, grade: int) -> str:
        """Create namespace for organizing vectors by subject and grade"""
        return f"{subject.lower()}_grade_{grade}"
    
    def prepare_vector_metadata(self, chunk: ProcessedChunk) -> Dict[str, Any]:
        """Prepare metadata for vector storage"""
        return {
            "content_id": self.generate_content_id(chunk),
            "subject": chunk.metadata.subject,
            "grade": chunk.metadata.grade,
            "chapter": chunk.metadata.chapter,
            "topic": chunk.metadata.topic,
            "language": chunk.metadata.language,
            "page_number": chunk.metadata.page_number,
            "textbook_name": chunk.metadata.textbook_name,
            "source_file": chunk.metadata.source_file,
            "chunk_index": chunk.metadata.chunk_index,
            "text_length": len(chunk.content),
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    
    async def upload_chunks_to_vector_db(
        self, 
        chunks: List[ProcessedChunk],
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Upload processed chunks to vector database
        
        Args:
            chunks: List of processed chunks
            progress_callback: Optional callback for progress tracking
            
        Returns:
            Upload statistics
        """
        try:
            total_chunks = len(chunks)
            uploaded_count = 0
            failed_count = 0
            
            logger.info(f"Starting upload of {total_chunks} chunks to vector database")
            
            # Process in batches
            for i in range(0, total_chunks, self.config.batch_size):
                batch = chunks[i:i + self.config.batch_size]
                
                try:
                    # Generate embeddings for batch
                    texts = [chunk.content for chunk in batch]
                    embeddings = await self.generate_embeddings_batch(texts)
                    
                    # Prepare vectors for upload
                    vectors = []
                    for chunk, embedding in zip(batch, embeddings):
                        content_id = self.generate_content_id(chunk)
                        metadata = self.prepare_vector_metadata(chunk)
                        namespace = self.create_namespace(chunk.metadata.subject, chunk.metadata.grade)
                        
                        vectors.append({
                            "id": content_id,
                            "values": embedding,
                            "metadata": metadata
                        })
                    
                    # Upload to Pinecone
                    if vectors:
                        # Group by namespace for upload
                        namespace_groups = {}
                        for vector in vectors:
                            ns = self.create_namespace(
                                vector["metadata"]["subject"], 
                                vector["metadata"]["grade"]
                            )
                            if ns not in namespace_groups:
                                namespace_groups[ns] = []
                            namespace_groups[ns].append(vector)
                        
                        # Upload each namespace group
                        for namespace, ns_vectors in namespace_groups.items():
                            await asyncio.get_event_loop().run_in_executor(
                                self.executor,
                                lambda: self.index.upsert(
                                    vectors=ns_vectors,
                                    namespace=namespace
                                )
                            )
                    
                    uploaded_count += len(batch)
                    
                    # Progress callback
                    if progress_callback:
                        progress_callback(uploaded_count, total_chunks)
                    
                    logger.info(f"Uploaded batch {i//self.config.batch_size + 1}: {uploaded_count}/{total_chunks}")
                    
                    # Rate limiting - small delay between batches
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    logger.error(f"Failed to upload batch {i//self.config.batch_size + 1}: {e}")
                    failed_count += len(batch)
                    continue
            
            stats = {
                "total_chunks": total_chunks,
                "uploaded_count": uploaded_count,
                "failed_count": failed_count,
                "success_rate": uploaded_count / total_chunks if total_chunks > 0 else 0
            }
            
            logger.info(f"Upload complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Vector upload failed: {e}")
            raise
    
    async def search_similar_chunks(
        self,
        query: str,
        subject: Optional[str] = None,
        grade: Optional[int] = None,
        top_k: int = 5,
        score_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks in vector database
        
        Args:
            query: Search query
            subject: Optional subject filter
            grade: Optional grade filter
            top_k: Number of results to return
            score_threshold: Minimum similarity score
            
        Returns:
            List of similar chunks with metadata and scores
        """
        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query)
            
            # Prepare filter
            filter_dict = {}
            if subject:
                filter_dict["subject"] = subject
            if grade:
                filter_dict["grade"] = grade
            
            # Determine namespace
            namespace = None
            if subject and grade:
                namespace = self.create_namespace(subject, grade)
            
            # Search in Pinecone
            search_results = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.index.query(
                    vector=query_embedding,
                    top_k=top_k,
                    include_metadata=True,
                    namespace=namespace,
                    filter=filter_dict if filter_dict else None
                )
            )
            
            # Filter by score threshold and format results
            results = []
            for match in search_results.matches:
                if match.score >= score_threshold:
                    results.append({
                        "content_id": match.id,
                        "score": match.score,
                        "metadata": match.metadata
                    })
            
            logger.info(f"Found {len(results)} similar chunks for query: {query[:50]}...")
            return results
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            raise
    
    def get_index_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector index"""
        try:
            stats = self.index.describe_index_stats()
            return {
                "total_vectors": stats.total_vector_count,
                "namespaces": dict(stats.namespaces) if stats.namespaces else {},
                "dimension": stats.dimension
            }
        except Exception as e:
            logger.error(f"Failed to get index stats: {e}")
            return {}
    
    def delete_vectors_by_filter(self, filter_dict: Dict[str, Any], namespace: Optional[str] = None):
        """Delete vectors matching filter criteria"""
        try:
            self.index.delete(filter=filter_dict, namespace=namespace)
            logger.info(f"Deleted vectors with filter: {filter_dict}")
        except Exception as e:
            logger.error(f"Failed to delete vectors: {e}")
            raise