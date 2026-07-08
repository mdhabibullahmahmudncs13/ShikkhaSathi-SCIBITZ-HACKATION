#!/usr/bin/env python3
"""
NCTB Text Document Loader for RAG System
Loads text files from backend/data/nctb/nctb_txt/ and ingests them into ChromaDB
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any
import re

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.rag.rag_service import RAGService

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class NCTBTextLoader:
    """Loader for NCTB text files"""
    
    def __init__(self, data_dir: str = "backend/data/nctb/nctb_txt"):
        self.data_dir = Path(data_dir)
        
        # Initialize RAG service and clear old collection
        self.rag_service = RAGService(
            collection_name="nctb_curriculum",
            persist_directory="./data/chroma_db"
        )
        
        # Clear old collection to ensure fresh start with correct dimensions
        logger.info("Clearing old collection to ensure correct embedding dimensions...")
        self.rag_service.clear_collection()
    
    def extract_metadata_from_filename(self, filename: str) -> Dict[str, Any]:
        """
        Extract metadata from filename
        
        Examples:
        - "ICT 9-10.txt" -> subject: ICT, grade: 9-10
        - "Math class 9-10 EV book full pdf.txt" -> subject: Math, grade: 9-10
        - "Physics  9-10 EV book full pdf_compressed.txt" -> subject: Physics, grade: 9-10
        - "Bangla Sahitto pdf class 9-10 com_oc.txt" -> subject: Bangla, grade: 9-10
        """
        filename_lower = filename.lower()
        
        # Extract subject
        subject = "Unknown"
        if "ict" in filename_lower:
            subject = "ICT"
        elif "math" in filename_lower:
            subject = "Mathematics"
        elif "physics" in filename_lower:
            subject = "Physics"
        elif "english" in filename_lower:
            subject = "English"
        elif "bangla" in filename_lower or "বাংলা" in filename:
            subject = "Bangla"
        
        # Extract grade
        grade_match = re.search(r'(\d+)-(\d+)', filename)
        if grade_match:
            grade = f"{grade_match.group(1)}-{grade_match.group(2)}"
        else:
            grade = "9-10"  # Default for NCTB
        
        # Detect language
        language = "english"
        if "bangla" in filename_lower or "বাংলা" in filename or "sahitto" in filename_lower:
            language = "bangla"
        
        return {
            "subject": subject,
            "grade": grade,
            "language": language,
            "source_file": filename,
            "textbook_name": f"{subject} Class {grade}",
            "curriculum": "NCTB Bangladesh"
        }
    
    def load_text_file(self, filepath: Path) -> str:
        """Load text content from file"""
        try:
            # Try UTF-8 first
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Fallback to other encodings
            try:
                with open(filepath, 'r', encoding='latin-1') as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Failed to read {filepath}: {e}")
                return ""
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        text = re.sub(r' +', ' ', text)
        
        # Remove page markers if present
        text = re.sub(r'--- Page \d+ ---', '', text)
        
        return text.strip()
    
    async def load_all_documents(self) -> Dict[str, Any]:
        """Load all NCTB text documents into RAG system"""
        if not self.data_dir.exists():
            logger.error(f"Data directory not found: {self.data_dir}")
            return {"success": False, "error": "Data directory not found"}
        
        # Find all text files
        txt_files = list(self.data_dir.glob("*.txt"))
        
        if not txt_files:
            logger.warning(f"No text files found in {self.data_dir}")
            return {"success": False, "error": "No text files found"}
        
        logger.info(f"Found {len(txt_files)} text files to process")
        
        stats = {
            "total_files": len(txt_files),
            "successful": 0,
            "failed": 0,
            "files_processed": []
        }
        
        for idx, txt_file in enumerate(txt_files, 1):
            try:
                logger.info(f"\n[{idx}/{len(txt_files)}] Processing: {txt_file.name}")
                
                # Load text content
                text_content = self.load_text_file(txt_file)
                
                if not text_content.strip():
                    logger.warning(f"Empty file: {txt_file.name}")
                    stats["failed"] += 1
                    continue
                
                # Clean text
                text_content = self.clean_text(text_content)
                
                # Extract metadata
                metadata = self.extract_metadata_from_filename(txt_file.name)
                metadata["id"] = txt_file.stem
                
                logger.info(f"  Subject: {metadata['subject']}, Grade: {metadata['grade']}, Length: {len(text_content)} chars")
                
                # Ingest into RAG system (this will chunk and embed)
                success = await self.rag_service.ingest_text(text_content, metadata)
                
                if success:
                    stats["successful"] += 1
                    stats["files_processed"].append({
                        "filename": txt_file.name,
                        "subject": metadata["subject"],
                        "grade": metadata["grade"],
                        "text_length": len(text_content),
                        "status": "success"
                    })
                    logger.info(f"  ✅ Success")
                else:
                    stats["failed"] += 1
                    stats["files_processed"].append({
                        "filename": txt_file.name,
                        "status": "failed"
                    })
                    logger.error(f"  ❌ Failed")
                
            except Exception as e:
                logger.error(f"Error processing {txt_file.name}: {e}")
                stats["failed"] += 1
                stats["files_processed"].append({
                    "filename": txt_file.name,
                    "status": "error",
                    "error": str(e)
                })
        
        # Get collection stats
        collection_stats = self.rag_service.get_collection_stats()
        stats["collection_stats"] = collection_stats
        
        logger.info(f"\n{'='*60}")
        logger.info("LOADING COMPLETE")
        logger.info(f"{'='*60}")
        logger.info(f"Total files: {stats['total_files']}")
        logger.info(f"Successful: {stats['successful']}")
        logger.info(f"Failed: {stats['failed']}")
        logger.info(f"Documents in collection: {collection_stats.get('document_count', 0)}")
        logger.info(f"{'='*60}\n")
        
        return stats

async def main():
    """Main function to load NCTB documents"""
    print("\n" + "="*60)
    print("NCTB Text Document Loader for RAG System")
    print("="*60 + "\n")
    
    loader = NCTBTextLoader()
    
    # Load all documents
    stats = await loader.load_all_documents()
    
    if stats.get("successful", 0) > 0:
        print("\n✅ Documents loaded successfully!")
        print(f"📚 {stats['successful']} files ingested into RAG system")
        print(f"📊 Total documents in collection: {stats.get('collection_stats', {}).get('document_count', 0)}")
        
        # Test search
        print("\n" + "="*60)
        print("Testing RAG Search...")
        print("="*60)
        
        test_queries = [
            "What is photosynthesis?",
            "Explain quadratic formula",
            "বাংলা ব্যাকরণ কি?"
        ]
        
        for query in test_queries:
            print(f"\nQuery: {query}")
            results = await loader.rag_service.search_similar(query, n_results=2)
            if results:
                print(f"Found {len(results)} relevant documents")
                for i, result in enumerate(results, 1):
                    print(f"  {i}. {result['metadata'].get('subject', 'Unknown')} - {result['content'][:100]}...")
            else:
                print("  No results found")
    else:
        print("\n❌ Failed to load documents")
        print(f"Errors: {stats.get('failed', 0)}")
    
    print("\n" + "="*60)
    print("Done!")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
