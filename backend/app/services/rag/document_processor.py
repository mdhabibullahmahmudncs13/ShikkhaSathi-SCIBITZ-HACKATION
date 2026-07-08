"""
Document Processing Pipeline for NCTB Content
Handles PDF text extraction, OCR processing, and text chunking
Enhanced with text file saving functionality
"""

import os
import logging
import json
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import PyPDF2
import pytesseract
from PIL import Image
import io
import re
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class DocumentMetadata(BaseModel):
    """Metadata structure for processed documents"""
    subject: str
    grade: int
    chapter: Optional[int] = None
    topic: Optional[str] = None
    language: str = "bangla"
    page_number: Optional[int] = None
    textbook_name: Optional[str] = None
    source_file: str
    chunk_index: int = 0

class ProcessedChunk(BaseModel):
    """Processed document chunk with metadata"""
    content: str
    metadata: DocumentMetadata
    chunk_id: str

class DocumentProcessor:
    """Main document processing pipeline for NCTB content"""
    
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", "।", ".", " ", ""]
        )
        
        # Setup directories for saving extracted text
        self.extracted_text_dir = Path("data/extracted_text")
        self.pages_dir = self.extracted_text_dir / "pages"
        self.chunks_dir = self.extracted_text_dir / "chunks"
        self.full_docs_dir = self.extracted_text_dir / "full_documents"
        self.logs_dir = self.extracted_text_dir / "processing_logs"
        
        # Create directories if they don't exist
        for directory in [self.pages_dir, self.chunks_dir, self.full_docs_dir, self.logs_dir]:
            directory.mkdir(parents=True, exist_ok=True)
            (directory / "metadata").mkdir(exist_ok=True)
    
    def _save_page_text(self, text: str, filename: str, page_number: int, metadata: Dict[str, Any]) -> str:
        """
        Save extracted page text to file
        
        Args:
            text: Extracted text content
            filename: Source filename (without extension)
            page_number: Page number
            metadata: Page metadata
            
        Returns:
            Path to saved text file
        """
        try:
            # Create filename for page text
            page_filename = f"{filename}_page_{page_number:03d}.txt"
            page_filepath = self.pages_dir / page_filename
            
            # Save text content
            with open(page_filepath, 'w', encoding='utf-8') as f:
                f.write(f"# Page {page_number} from {filename}\n")
                f.write(f"# Extracted on: {datetime.now().isoformat()}\n")
                f.write(f"# Character count: {len(text)}\n")
                f.write(f"# Language: {metadata.get('language', 'unknown')}\n")
                f.write("\n" + "="*50 + "\n\n")
                f.write(text)
            
            # Save metadata
            metadata_filename = f"{filename}_page_{page_number:03d}_metadata.json"
            metadata_filepath = self.pages_dir / "metadata" / metadata_filename
            
            page_metadata = {
                **metadata,
                "extraction_timestamp": datetime.now().isoformat(),
                "character_count": len(text),
                "word_count": len(text.split()),
                "line_count": len(text.split('\n')),
                "text_file_path": str(page_filepath)
            }
            
            with open(metadata_filepath, 'w', encoding='utf-8') as f:
                json.dump(page_metadata, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"Saved page text: {page_filepath}")
            return str(page_filepath)
            
        except Exception as e:
            logger.error(f"Failed to save page text: {e}")
            return ""
    
    def _save_full_document_text(self, pages_data: List[Dict[str, Any]], filename: str) -> str:
        """
        Save complete document text to file
        
        Args:
            pages_data: List of page data dictionaries
            filename: Source filename (without extension)
            
        Returns:
            Path to saved full document text file
        """
        try:
            # Combine all page texts
            full_text_parts = []
            total_chars = 0
            
            for page_data in pages_data:
                page_num = page_data['page_number']
                text = page_data['text']
                
                full_text_parts.append(f"\n{'='*60}")
                full_text_parts.append(f"PAGE {page_num}")
                full_text_parts.append('='*60 + "\n")
                full_text_parts.append(text)
                full_text_parts.append("\n")
                
                total_chars += len(text)
            
            full_text = "\n".join(full_text_parts)
            
            # Save full document text
            full_filename = f"{filename}_full.txt"
            full_filepath = self.full_docs_dir / full_filename
            
            with open(full_filepath, 'w', encoding='utf-8') as f:
                f.write(f"# Complete text from {filename}\n")
                f.write(f"# Extracted on: {datetime.now().isoformat()}\n")
                f.write(f"# Total pages: {len(pages_data)}\n")
                f.write(f"# Total characters: {total_chars}\n")
                f.write(f"# Total words: {len(full_text.split())}\n")
                f.write("\n" + "="*80 + "\n")
                f.write(full_text)
            
            # Save document metadata
            doc_metadata = {
                "source_file": filename,
                "extraction_timestamp": datetime.now().isoformat(),
                "total_pages": len(pages_data),
                "total_characters": total_chars,
                "total_words": len(full_text.split()),
                "total_lines": len(full_text.split('\n')),
                "text_file_path": str(full_filepath),
                "pages_processed": [p['page_number'] for p in pages_data]
            }
            
            metadata_filename = f"{filename}_full_metadata.json"
            metadata_filepath = self.full_docs_dir / "metadata" / metadata_filename
            
            with open(metadata_filepath, 'w', encoding='utf-8') as f:
                json.dump(doc_metadata, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved full document text: {full_filepath}")
            return str(full_filepath)
            
        except Exception as e:
            logger.error(f"Failed to save full document text: {e}")
            return ""
    
    def _save_chunk_text(self, chunk: 'ProcessedChunk', filename: str) -> str:
        """
        Save text chunk to file
        
        Args:
            chunk: ProcessedChunk object
            filename: Source filename (without extension)
            
        Returns:
            Path to saved chunk text file
        """
        try:
            # Create filename for chunk
            chunk_filename = f"{filename}_chunk_{chunk.metadata.chunk_index:03d}.txt"
            chunk_filepath = self.chunks_dir / chunk_filename
            
            # Save chunk content
            with open(chunk_filepath, 'w', encoding='utf-8') as f:
                f.write(f"# Chunk {chunk.metadata.chunk_index} from {filename}\n")
                f.write(f"# Page: {chunk.metadata.page_number}\n")
                f.write(f"# Subject: {chunk.metadata.subject}\n")
                f.write(f"# Grade: {chunk.metadata.grade}\n")
                f.write(f"# Language: {chunk.metadata.language}\n")
                f.write(f"# Created on: {datetime.now().isoformat()}\n")
                f.write(f"# Character count: {len(chunk.content)}\n")
                f.write(f"# Chunk ID: {chunk.chunk_id}\n")
                f.write("\n" + "="*40 + "\n\n")
                f.write(chunk.content)
            
            # Save chunk metadata
            metadata_filename = f"{filename}_chunk_{chunk.metadata.chunk_index:03d}_metadata.json"
            metadata_filepath = self.chunks_dir / "metadata" / metadata_filename
            
            chunk_metadata = {
                **chunk.metadata.dict(),
                "extraction_timestamp": datetime.now().isoformat(),
                "character_count": len(chunk.content),
                "word_count": len(chunk.content.split()),
                "line_count": len(chunk.content.split('\n')),
                "text_file_path": str(chunk_filepath),
                "chunk_id": chunk.chunk_id
            }
            
            with open(metadata_filepath, 'w', encoding='utf-8') as f:
                json.dump(chunk_metadata, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"Saved chunk text: {chunk_filepath}")
            return str(chunk_filepath)
            
        except Exception as e:
            logger.error(f"Failed to save chunk text: {e}")
            return ""
    
    def _save_processing_log(self, filename: str, processing_stats: Dict[str, Any]) -> str:
        """
        Save processing log and statistics
        
        Args:
            filename: Source filename (without extension)
            processing_stats: Processing statistics
            
        Returns:
            Path to saved log file
        """
        try:
            log_filename = f"{filename}_processing_log.txt"
            log_filepath = self.logs_dir / log_filename
            
            with open(log_filepath, 'w', encoding='utf-8') as f:
                f.write(f"# Processing Log for {filename}\n")
                f.write(f"# Processed on: {datetime.now().isoformat()}\n")
                f.write("\n" + "="*50 + "\n\n")
                
                f.write("## Processing Statistics:\n")
                for key, value in processing_stats.items():
                    f.write(f"- {key}: {value}\n")
                
                f.write(f"\n## File Locations:\n")
                f.write(f"- Pages directory: {self.pages_dir}\n")
                f.write(f"- Chunks directory: {self.chunks_dir}\n")
                f.write(f"- Full document: {self.full_docs_dir}\n")
                
                f.write(f"\n## Processing Configuration:\n")
                f.write(f"- Chunk size: {self.chunk_size}\n")
                f.write(f"- Chunk overlap: {self.chunk_overlap}\n")
            
            logger.info(f"Saved processing log: {log_filepath}")
            return str(log_filepath)
            
        except Exception as e:
            logger.error(f"Failed to save processing log: {e}")
            return ""
        
    def extract_text_from_pdf(self, pdf_path: str) -> List[Dict[str, Any]]:
        """
        Extract text from PDF file with page-level metadata and save to text files
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            List of dictionaries containing text and page metadata
        """
        try:
            pages_data = []
            filename = Path(pdf_path).stem  # Get filename without extension
            
            logger.info(f"📄 Starting PDF text extraction: {pdf_path}")
            
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                total_pages = len(pdf_reader.pages)
                
                logger.info(f"📖 Processing {total_pages} pages...")
                
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    try:
                        text = page.extract_text()
                        if text.strip():  # Only include pages with text
                            page_data = {
                                'text': text,
                                'page_number': page_num,
                                'source_file': os.path.basename(pdf_path)
                            }
                            pages_data.append(page_data)
                            
                            # 💾 Save individual page text to file
                            base_metadata = self.extract_metadata_from_filename(pdf_path)
                            page_metadata = {**base_metadata, **page_data}
                            page_metadata['language'] = self.detect_language(text)
                            
                            self._save_page_text(text, filename, page_num, page_metadata)
                            
                            logger.debug(f"✅ Processed page {page_num}/{total_pages}")
                            
                    except Exception as e:
                        logger.warning(f"❌ Failed to extract text from page {page_num}: {e}")
                        continue
            
            # 💾 Save complete document text
            if pages_data:
                self._save_full_document_text(pages_data, filename)
                
                # Save processing statistics
                processing_stats = {
                    "source_file": pdf_path,
                    "total_pages_in_pdf": total_pages,
                    "pages_with_text": len(pages_data),
                    "pages_skipped": total_pages - len(pages_data),
                    "extraction_success_rate": f"{(len(pages_data)/total_pages)*100:.1f}%",
                    "total_characters": sum(len(p['text']) for p in pages_data),
                    "average_chars_per_page": sum(len(p['text']) for p in pages_data) // len(pages_data) if pages_data else 0
                }
                
                self._save_processing_log(filename, processing_stats)
                        
            logger.info(f"✅ Extracted text from {len(pages_data)}/{total_pages} pages from {pdf_path}")
            logger.info(f"📁 Text files saved in: {self.extracted_text_dir}")
            
            return pages_data
            
        except Exception as e:
            logger.error(f"❌ Failed to process PDF {pdf_path}: {e}")
            raise
    
    def process_with_ocr(self, image_path: str, language: str = "ben+eng") -> str:
        """
        Process image with OCR for Bangla text extraction
        
        Args:
            image_path: Path to the image file
            language: Tesseract language code (ben for Bangla, eng for English)
            
        Returns:
            Extracted text from image
        """
        try:
            image = Image.open(image_path)
            
            # Configure Tesseract for better Bangla recognition
            custom_config = f'--oem 3 --psm 6 -l {language}'
            text = pytesseract.image_to_string(image, config=custom_config)
            
            return self._clean_ocr_text(text)
            
        except Exception as e:
            logger.error(f"OCR processing failed for {image_path}: {e}")
            raise
    
    def _clean_ocr_text(self, text: str) -> str:
        """Clean and normalize OCR extracted text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove common OCR artifacts
        text = re.sub(r'[^\w\s\u0980-\u09FF।,;:.!?()-]', '', text)
        
        # Normalize Bangla punctuation
        text = text.replace('|', '।')
        
        return text.strip()
    
    def extract_metadata_from_filename(self, filename: str) -> Dict[str, Any]:
        """
        Extract metadata from standardized filename patterns
        Expected format: subject_grade_chapter_topic.pdf
        Example: physics_9_3_newtons_laws.pdf
        """
        try:
            base_name = Path(filename).stem
            parts = base_name.split('_')
            
            metadata = {
                'source_file': filename,
                'subject': parts[0].title() if len(parts) > 0 else 'Unknown',
                'grade': int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 9,
                'chapter': int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else None,
                'topic': ' '.join(parts[3:]).replace('_', ' ').title() if len(parts) > 3 else None,
                'language': 'bangla',  # Default to Bangla for NCTB content
                'textbook_name': f"{parts[0].title()} for Class {parts[1] if len(parts) > 1 else 'IX'}"
            }
            
            return metadata
            
        except Exception as e:
            logger.warning(f"Could not extract metadata from filename {filename}: {e}")
            return {
                'source_file': filename,
                'subject': 'Unknown',
                'grade': 9,
                'language': 'bangla'
            }
    
    def detect_language(self, text: str) -> str:
        """
        Detect if text is primarily Bangla or English
        
        Args:
            text: Text to analyze
            
        Returns:
            'bangla' or 'english'
        """
        # Count Bangla Unicode characters
        bangla_chars = len(re.findall(r'[\u0980-\u09FF]', text))
        english_chars = len(re.findall(r'[a-zA-Z]', text))
        
        # If more than 30% Bangla characters, consider it Bangla
        total_chars = bangla_chars + english_chars
        if total_chars > 0 and bangla_chars / total_chars > 0.3:
            return 'bangla'
        else:
            return 'english'
    
    def chunk_text(self, text: str, metadata: Dict[str, Any]) -> List[ProcessedChunk]:
        """
        Split text into chunks with metadata preservation and save to text files
        
        Args:
            text: Text to chunk
            metadata: Base metadata to attach to chunks
            
        Returns:
            List of ProcessedChunk objects
        """
        try:
            # Create LangChain document
            doc = Document(page_content=text, metadata=metadata)
            
            # Split into chunks
            chunks = self.text_splitter.split_documents([doc])
            
            processed_chunks = []
            filename = Path(metadata.get('source_file', 'unknown')).stem
            
            logger.debug(f"✂️ Chunking text into {len(chunks)} pieces...")
            
            for i, chunk in enumerate(chunks):
                # Create chunk metadata
                chunk_metadata = DocumentMetadata(
                    **metadata,
                    chunk_index=i
                )
                
                # Generate unique chunk ID
                chunk_id = f"{metadata.get('source_file', 'unknown')}_{metadata.get('page_number', 0)}_{i}"
                
                processed_chunk = ProcessedChunk(
                    content=chunk.page_content,
                    metadata=chunk_metadata,
                    chunk_id=chunk_id
                )
                
                # 💾 Save chunk text to file
                self._save_chunk_text(processed_chunk, filename)
                
                processed_chunks.append(processed_chunk)
                
                logger.debug(f"✅ Processed chunk {i+1}/{len(chunks)}")
            
            logger.info(f"✂️ Created {len(processed_chunks)} text chunks")
            logger.info(f"📁 Chunk files saved in: {self.chunks_dir}")
            
            return processed_chunks
            
        except Exception as e:
            logger.error(f"❌ Text chunking failed: {e}")
            raise
    
    def validate_document(self, file_path: str) -> bool:
        """
        Validate document before processing
        
        Args:
            file_path: Path to document file
            
        Returns:
            True if document is valid for processing
        """
        try:
            if not os.path.exists(file_path):
                return False
                
            file_size = os.path.getsize(file_path)
            
            # Check file size (max 50MB)
            if file_size > 50 * 1024 * 1024:
                logger.warning(f"File {file_path} too large: {file_size} bytes")
                return False
            
            # Check file extension
            valid_extensions = {'.pdf', '.png', '.jpg', '.jpeg', '.tiff'}
            if Path(file_path).suffix.lower() not in valid_extensions:
                logger.warning(f"Unsupported file type: {file_path}")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Document validation failed for {file_path}: {e}")
            return False
    
    def process_document(self, file_path: str) -> List[ProcessedChunk]:
        """
        Main document processing pipeline
        
        Args:
            file_path: Path to document file
            
        Returns:
            List of processed chunks with metadata
        """
        try:
            # Validate document
            if not self.validate_document(file_path):
                raise ValueError(f"Invalid document: {file_path}")
            
            # Extract base metadata from filename
            base_metadata = self.extract_metadata_from_filename(file_path)
            
            all_chunks = []
            file_extension = Path(file_path).suffix.lower()
            
            if file_extension == '.pdf':
                # Process PDF
                pages_data = self.extract_text_from_pdf(file_path)
                
                for page_data in pages_data:
                    # Update metadata with page info
                    page_metadata = {**base_metadata, **page_data}
                    
                    # Detect language
                    page_metadata['language'] = self.detect_language(page_data['text'])
                    
                    # Chunk the page text
                    page_chunks = self.chunk_text(page_data['text'], page_metadata)
                    all_chunks.extend(page_chunks)
                    
            elif file_extension in {'.png', '.jpg', '.jpeg', '.tiff'}:
                # Process image with OCR
                text = self.process_with_ocr(file_path)
                
                if text.strip():
                    # Update metadata
                    base_metadata['language'] = self.detect_language(text)
                    base_metadata['page_number'] = 1
                    
                    # Chunk the extracted text
                    chunks = self.chunk_text(text, base_metadata)
                    all_chunks.extend(chunks)
            
            logger.info(f"Processed {file_path} into {len(all_chunks)} chunks")
            return all_chunks
            
        except Exception as e:
            logger.error(f"Document processing failed for {file_path}: {e}")
            raise

    def batch_process_documents(self, directory_path: str) -> List[ProcessedChunk]:
        """
        Process all documents in a directory
        
        Args:
            directory_path: Path to directory containing documents
            
        Returns:
            List of all processed chunks
        """
        try:
            all_chunks = []
            directory = Path(directory_path)
            
            if not directory.exists():
                raise ValueError(f"Directory does not exist: {directory_path}")
            
            # Find all supported files
            supported_extensions = {'.pdf', '.png', '.jpg', '.jpeg', '.tiff'}
            files = [f for f in directory.rglob('*') if f.suffix.lower() in supported_extensions]
            
            logger.info(f"Found {len(files)} documents to process in {directory_path}")
            
            for file_path in files:
                try:
                    chunks = self.process_document(str(file_path))
                    all_chunks.extend(chunks)
                except Exception as e:
                    logger.error(f"Failed to process {file_path}: {e}")
                    continue
            
            logger.info(f"Batch processing complete: {len(all_chunks)} total chunks")
            return all_chunks
            
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            raise