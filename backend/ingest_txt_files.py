#!/usr/bin/env python3
"""
Text File Ingestion Script for ShikkhaSathi RAG System
This script processes .txt files directly into the RAG system

Usage:
    python ingest_txt_files.py --file path/to/document.txt
    python ingest_txt_files.py --directory data/nctb_txt/
    python ingest_txt_files.py --clear-db
"""

import asyncio
import argparse
import logging
from pathlib import Path
import sys
import os
from typing import List, Dict, Any

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.rag.rag_service import get_rag_service
from app.services.rag.document_processor import DocumentProcessor, ProcessedChunk

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TextFileIngestionPipeline:
    """Text file ingestion pipeline for RAG system"""
    
    def __init__(self):
        """Initialize the ingestion pipeline"""
        self.document_processor = DocumentProcessor()
        self.rag_service = get_rag_service()
        
        if self.rag_service is None:
            raise RuntimeError("Failed to initialize RAG service")
        
        # Paths
        self.input_dir = Path("data/nctb/nctb_txt")  # 📁 INPUT: TXT files location
        self.vector_db_dir = Path("data/chroma_db")  # 🗄️ OUTPUT: Vector database storage
        
        # Create directories if they don't exist
        self.input_dir.mkdir(parents=True, exist_ok=True)
        self.vector_db_dir.mkdir(parents=True, exist_ok=True)
    
    def extract_metadata_from_filename(self, file_path: str) -> Dict[str, Any]:
        """Extract metadata from filename"""
        filename = Path(file_path).stem
        
        # Default metadata
        metadata = {
            'source_file': Path(file_path).name,
            'file_type': 'txt',
            'grade': 9,  # Default grade
            'subject': 'general',  # Default subject
            'language': 'mixed'  # Will be detected later
        }
        
        # Extract grade from filename
        filename_lower = filename.lower()
        if 'class 9' in filename_lower or 'grade 9' in filename_lower:
            metadata['grade'] = 9
        elif 'class 10' in filename_lower or 'grade 10' in filename_lower:
            metadata['grade'] = 10
        elif '9-10' in filename_lower:
            metadata['grade'] = 9  # Default to 9 for 9-10 books
        else:
            metadata['grade'] = 9  # Default grade if not detected
        
        # Extract subject from filename
        if 'math' in filename_lower or 'গণিত' in filename_lower:
            metadata['subject'] = 'mathematics'
        elif 'physics' in filename_lower or 'পদার্থ' in filename_lower:
            metadata['subject'] = 'physics'
        elif 'chemistry' in filename_lower or 'রসায়ন' in filename_lower:
            metadata['subject'] = 'chemistry'
        elif 'biology' in filename_lower or 'জীববিজ্ঞান' in filename_lower:
            metadata['subject'] = 'biology'
        elif 'bangla' in filename_lower or 'বাংলা' in filename_lower or 'sahitto' in filename_lower or 'সাহিত্য' in filename_lower or 'সহপাঠ' in filename_lower:
            metadata['subject'] = 'bangla'
        elif 'english' in filename_lower or 'ইংরেজি' in filename_lower:
            metadata['subject'] = 'english'
        elif 'ict' in filename_lower or 'তথ্য' in filename_lower:
            metadata['subject'] = 'ict'
        
        # Set textbook name based on subject and filename
        if metadata['subject'] == 'bangla':
            if 'sahitto' in filename_lower or 'সাহিত্য' in filename_lower:
                metadata['textbook_name'] = 'বাংলা সাহিত্য (নবম ও দশম শ্রেণি)'
            elif 'সহপাঠ' in filename_lower:
                metadata['textbook_name'] = 'বাংলা সহপাঠ (নবম ও দশম শ্রেণি)'
            else:
                metadata['textbook_name'] = f"বাংলা পাঠ্যবই (নবম ও দশম শ্রেণি)"
        else:
            metadata['textbook_name'] = f"NCTB {metadata['subject'].title()} (Class {metadata['grade']})"
        
        return metadata
    
    async def ingest_single_text_file(self, file_path: str) -> bool:
        """
        Process a single text file into the RAG system
        
        Args:
            file_path: Path to the text file
            
        Returns:
            bool: Success status
        """
        try:
            logger.info(f"🚀 Processing text file: {file_path}")
            
            # Read the text file
            with open(file_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
            
            if not text_content.strip():
                logger.warning(f"⚠️ Empty file: {file_path}")
                return False
            
            logger.info(f"📄 Read {len(text_content)} characters from {Path(file_path).name}")
            
            # Extract metadata
            base_metadata = self.extract_metadata_from_filename(file_path)
            base_metadata['language'] = self.document_processor.detect_language(text_content)
            
            logger.info(f"📋 Metadata: {base_metadata}")
            
            # Chunk the text
            logger.info("✂️ Chunking text...")
            chunks = self.document_processor.chunk_text(text_content, base_metadata)
            logger.info(f"   ✅ Created {len(chunks)} chunks")
            
            if not chunks:
                logger.warning(f"⚠️ No chunks created for {file_path}")
                return False
            
            # Generate embeddings
            logger.info("🧮 Generating embeddings...")
            texts = [chunk.content for chunk in chunks]
            embeddings = await self.rag_service._generate_embeddings(texts)
            logger.info(f"   ✅ Generated {len(embeddings)} embeddings")
            
            # Store in vector database
            logger.info("🗄️ Storing in ChromaDB...")
            
            # Prepare metadata for each chunk
            metadatas = []
            ids = []
            
            for i, chunk in enumerate(chunks):
                # Create metadata for this chunk
                chunk_metadata = {
                    'source_file': base_metadata['source_file'],
                    'file_type': base_metadata['file_type'],
                    'grade': base_metadata['grade'],
                    'subject': base_metadata['subject'],
                    'language': base_metadata['language'],
                    'chunk_index': i,
                    'page_number': 1,  # Default for text files
                    'chapter': 1,  # Default
                    'topic': 'general',  # Default
                    'textbook_name': base_metadata.get('textbook_name', 'NCTB Textbook')
                }
                
                # Clean metadata - ensure no None values
                cleaned_metadata = {}
                for key, value in chunk_metadata.items():
                    if value is None:
                        # Provide default values for None fields
                        if key == 'grade':
                            cleaned_metadata[key] = 9
                        elif key == 'subject':
                            cleaned_metadata[key] = 'general'
                        elif key == 'chapter':
                            cleaned_metadata[key] = 1
                        elif key == 'topic':
                            cleaned_metadata[key] = 'general'
                        elif key == 'textbook_name':
                            cleaned_metadata[key] = 'NCTB Textbook'
                        elif key == 'page_number':
                            cleaned_metadata[key] = 1
                        else:
                            cleaned_metadata[key] = 'unknown'
                    else:
                        cleaned_metadata[key] = str(value)  # Convert all values to strings
                
                metadatas.append(cleaned_metadata)
                
                # Generate unique ID for this chunk
                chunk_id = f"{Path(file_path).stem}_{i}"
                ids.append(chunk_id)
            
            self.rag_service.collection.add(
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"✅ Successfully processed {Path(file_path).name}")
            logger.info(f"   📊 Added {len(chunks)} chunks to vector database")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to process {file_path}: {str(e)}")
            return False
    
    async def ingest_directory(self, directory_path: str) -> Dict[str, int]:
        """
        Process all .txt files in a directory
        
        Args:
            directory_path: Path to directory containing .txt files
            
        Returns:
            dict: Processing statistics
        """
        try:
            directory = Path(directory_path)
            if not directory.exists():
                logger.error(f"❌ Directory not found: {directory_path}")
                return {"success": 0, "failed": 0, "total": 0}
            
            # Find all .txt files
            txt_files = list(directory.rglob('*.txt'))
            
            if not txt_files:
                logger.warning(f"⚠️ No .txt files found in {directory_path}")
                return {"success": 0, "failed": 0, "total": 0}
            
            logger.info(f"📁 Found {len(txt_files)} text files to process")
            
            success_count = 0
            failed_count = 0
            
            for file_path in txt_files:
                logger.info(f"\n{'='*60}")
                logger.info(f"Processing: {file_path.name}")
                logger.info(f"{'='*60}")
                
                success = await self.ingest_single_text_file(str(file_path))
                if success:
                    success_count += 1
                else:
                    failed_count += 1
            
            stats = {
                "success": success_count,
                "failed": failed_count,
                "total": len(txt_files)
            }
            
            logger.info(f"\n🎯 BATCH PROCESSING COMPLETE:")
            logger.info(f"   ✅ Successful: {success_count}")
            logger.info(f"   ❌ Failed: {failed_count}")
            logger.info(f"   📊 Total: {len(txt_files)}")
            
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
    
    def get_database_stats(self) -> Dict[str, Any]:
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
        description="ShikkhaSathi Text File Ingestion Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Process a single text file
    python ingest_txt_files.py --file data/nctb_txt/physics_grade_9.txt
    
    # Process all text files in directory
    python ingest_txt_files.py --directory data/nctb_txt/
    
    # Clear existing database
    python ingest_txt_files.py --clear-db
    
    # Show database statistics
    python ingest_txt_files.py --stats
        """
    )
    
    parser.add_argument('--file', '-f', help='Process a single text file')
    parser.add_argument('--directory', '-d', help='Process all text files in directory')
    parser.add_argument('--clear-db', action='store_true', help='Clear vector database')
    parser.add_argument('--stats', action='store_true', help='Show database statistics')
    
    args = parser.parse_args()
    
    # Initialize pipeline
    pipeline = TextFileIngestionPipeline()
    
    if args.clear_db:
        await pipeline.clear_vector_database()
    elif args.stats:
        pipeline.get_database_stats()
    elif args.file:
        await pipeline.ingest_single_text_file(args.file)
    elif args.directory:
        await pipeline.ingest_directory(args.directory)
    else:
        parser.print_help()
        print("\n🚀 Quick Start:")
        print("python ingest_txt_files.py --directory data/nctb_txt/")

if __name__ == "__main__":
    asyncio.run(main())