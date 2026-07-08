#!/usr/bin/env python3
"""
Document Ingestion Script for ShikkhaSathi RAG System
This script demonstrates the complete RAG pipeline: PDF/Image → Text → Chunks → Embeddings → Vector DB

Usage:
    python ingest_documents.py --help
    python ingest_documents.py --file path/to/document.pdf
    python ingest_documents.py --directory data/nctb/
    python ingest_documents.py --clear-db  # Clear existing data
"""

import asyncio
import argparse
import logging
from pathlib import Path
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.rag.rag_service import rag_service
from app.services.rag.document_processor import DocumentProcessor
from app.services.rag.embedding_service import EmbeddingService, EmbeddingConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DocumentIngestionPipeline:
    """Complete document ingestion pipeline for RAG system"""
    
    def __init__(self):
        """Initialize the ingestion pipeline"""
        self.document_processor = DocumentProcessor()
        self.rag_service = rag_service
        
        # Paths for different stages
        self.input_dir = Path("data/nctb")  # 📁 INPUT: PDF/Image files location
        self.vector_db_dir = Path("data/chroma_db")  # 🗄️ OUTPUT: Vector database storage
        self.temp_dir = Path("data/temp")  # 🔄 TEMP: Processing temporary files
        
        # Create directories if they don't exist
        self.input_dir.mkdir(parents=True, exist_ok=True)
        self.vector_db_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    async def ingest_single_document(self, file_path: str) -> bool:
        """
        Complete RAG pipeline for a single document
        
        Pipeline Steps:
        1. 📄 PDF/Image Files (INPUT)
        2. 🔤 Text Extraction  
        3. ✂️ Text Chunking
        4. 🧮 Generate Embeddings
        5. 🗄️ Store in Vector Database
        
        Args:
            file_path: Path to the document file
            
        Returns:
            bool: Success status
        """
        try:
            logger.info(f"🚀 Starting RAG pipeline for: {file_path}")
            
            # STEP 1: 📄 PDF/Image Files (INPUT)
            # Location: backend/data/nctb/
            # Files: *.pdf, *.png, *.jpg, *.jpeg, *.tiff
            logger.info(f"📄 STEP 1: Reading document from {file_path}")
            
            if not Path(file_path).exists():
                logger.error(f"❌ File not found: {file_path}")
                return False
            
            # STEP 2: 🔤 Text Extraction
            # File: backend/app/services/rag/document_processor.py
            # Function: extract_text_from_pdf() or process_with_ocr()
            logger.info(f"🔤 STEP 2: Extracting text from document")
            
            if file_path.lower().endswith('.pdf'):
                # PDF text extraction using PyPDF2
                pages_data = self.document_processor.extract_text_from_pdf(file_path)
                logger.info(f"   ✅ Extracted text from {len(pages_data)} pages")
            else:
                # OCR processing for images using pytesseract
                text = self.document_processor.process_with_ocr(file_path)
                pages_data = [{'text': text, 'page_number': 1, 'source_file': Path(file_path).name}]
                logger.info(f"   ✅ OCR extracted {len(text)} characters")
            
            # STEP 3: ✂️ Text Chunking
            # File: backend/app/services/rag/document_processor.py
            # Function: chunk_text() using RecursiveCharacterTextSplitter
            # Output: Text files saved in backend/data/extracted_text/chunks/
            logger.info(f"✂️ STEP 3: Chunking text into smaller pieces")
            
            all_chunks = []
            base_metadata = self.document_processor.extract_metadata_from_filename(file_path)
            
            for page_data in pages_data:
                # Update metadata with page info
                page_metadata = {**base_metadata, **page_data}
                page_metadata['language'] = self.document_processor.detect_language(page_data['text'])
                
                # Chunk the page text (800 chars with 150 overlap)
                # 💾 This automatically saves chunk files to backend/data/extracted_text/chunks/
                page_chunks = self.document_processor.chunk_text(page_data['text'], page_metadata)
                all_chunks.extend(page_chunks)
            
            logger.info(f"   ✅ Created {len(all_chunks)} text chunks")
            logger.info(f"   📁 Chunk files saved in: backend/data/extracted_text/chunks/")
            logger.info(f"   📁 Page files saved in: backend/data/extracted_text/pages/")
            logger.info(f"   📁 Full document saved in: backend/data/extracted_text/full_documents/")
            
            # STEP 4: 🧮 Generate Embeddings
            # File: backend/app/services/rag/rag_service.py
            # Function: _generate_embeddings() using Ollama
            logger.info(f"🧮 STEP 4: Generating embeddings using Ollama")
            
            texts = [chunk.content for chunk in all_chunks]
            embeddings = await self.rag_service._generate_embeddings(texts)
            logger.info(f"   ✅ Generated {len(embeddings)} embeddings")
            
            # STEP 5: 🗄️ Store in Vector Database
            # File: backend/app/services/rag/rag_service.py
            # Storage: backend/data/chroma_db/ (ChromaDB)
            logger.info(f"🗄️ STEP 5: Storing in ChromaDB vector database")
            
            # Prepare data for ChromaDB
            metadatas = [chunk.metadata.dict() for chunk in all_chunks]
            ids = [chunk.chunk_id for chunk in all_chunks]
            
            # Store in ChromaDB collection
            self.rag_service.collection.add(
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"   ✅ Stored {len(texts)} chunks in vector database")
            logger.info(f"🎉 RAG pipeline completed successfully for {file_path}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ RAG pipeline failed for {file_path}: {str(e)}")
            return False
    
    async def ingest_directory(self, directory_path: str) -> dict:
        """
        Process all documents in a directory
        
        Args:
            directory_path: Path to directory containing documents
            
        Returns:
            dict: Processing statistics
        """
        try:
            directory = Path(directory_path)
            if not directory.exists():
                logger.error(f"❌ Directory not found: {directory_path}")
                return {"success": 0, "failed": 0, "total": 0}
            
            # Find all supported files
            supported_extensions = {'.pdf', '.png', '.jpg', '.jpeg', '.tiff'}
            files = [f for f in directory.rglob('*') if f.suffix.lower() in supported_extensions]
            
            logger.info(f"📁 Found {len(files)} documents to process in {directory_path}")
            
            success_count = 0
            failed_count = 0
            
            for file_path in files:
                logger.info(f"\n{'='*60}")
                logger.info(f"Processing: {file_path.name}")
                logger.info(f"{'='*60}")
                
                success = await self.ingest_single_document(str(file_path))
                if success:
                    success_count += 1
                else:
                    failed_count += 1
            
            stats = {
                "success": success_count,
                "failed": failed_count,
                "total": len(files)
            }
            
            logger.info(f"\n🎯 BATCH PROCESSING COMPLETE:")
            logger.info(f"   ✅ Successful: {success_count}")
            logger.info(f"   ❌ Failed: {failed_count}")
            logger.info(f"   📊 Total: {len(files)}")
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Directory processing failed: {str(e)}")
            return {"success": 0, "failed": 0, "total": 0}
    
    async def clear_vector_database(self) -> bool:
        """Clear all data from the vector database"""
        try:
            logger.info("🗑️ Clearing vector database...")
            success = await self.rag_service.clear_collection()
            if success:
                logger.info("✅ Vector database cleared successfully")
            else:
                logger.error("❌ Failed to clear vector database")
            return success
        except Exception as e:
            logger.error(f"❌ Error clearing database: {str(e)}")
            return False
    
    def get_database_stats(self) -> dict:
        """Get current database statistics"""
        try:
            stats = self.rag_service.get_collection_stats()
            logger.info(f"📊 Database Stats:")
            logger.info(f"   📄 Documents: {stats['document_count']}")
            logger.info(f"   🗄️ Collection: {stats['collection_name']}")
            return stats
        except Exception as e:
            logger.error(f"❌ Error getting stats: {str(e)}")
            return {}

async def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(
        description="ShikkhaSathi Document Ingestion Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Process a single PDF file
    python ingest_documents.py --file data/nctb/physics_grade_9.pdf
    
    # Process all documents in directory
    python ingest_documents.py --directory data/nctb/
    
    # Clear existing database
    python ingest_documents.py --clear-db
    
    # Show database statistics
    python ingest_documents.py --stats
        """
    )
    
    parser.add_argument('--file', '-f', help='Process a single document file')
    parser.add_argument('--directory', '-d', help='Process all documents in directory')
    parser.add_argument('--clear-db', action='store_true', help='Clear vector database')
    parser.add_argument('--stats', action='store_true', help='Show database statistics')
    
    args = parser.parse_args()
    
    # Initialize pipeline
    pipeline = DocumentIngestionPipeline()
    
    if args.clear_db:
        await pipeline.clear_vector_database()
    elif args.stats:
        pipeline.get_database_stats()
    elif args.file:
        await pipeline.ingest_single_document(args.file)
    elif args.directory:
        await pipeline.ingest_directory(args.directory)
    else:
        parser.print_help()
        print("\n🚀 Quick Start:")
        print("python ingest_documents.py --directory data/nctb/")

if __name__ == "__main__":
    asyncio.run(main())