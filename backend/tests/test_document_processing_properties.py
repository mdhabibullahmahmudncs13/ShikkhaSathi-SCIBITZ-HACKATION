"""
Property-based tests for document processing pipeline
Tests document chunking consistency and metadata preservation
"""

import pytest
import tempfile
import os
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings
from hypothesis.strategies import text, integers, composite
import PyPDF2
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

from app.services.rag.document_processor import DocumentProcessor, DocumentMetadata, ProcessedChunk


# Test data generators
@composite
def valid_text_content(draw):
    """Generate valid text content for testing"""
    # Generate text with mixed Bangla and English
    bangla_chars = "অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎংঃ"
    english_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    
    # Generate sentences with proper punctuation
    sentences = []
    num_sentences = draw(integers(min_value=1, max_value=10))
    
    for _ in range(num_sentences):
        # Mix of Bangla and English words
        words = []
        num_words = draw(integers(min_value=3, max_value=15))
        
        for _ in range(num_words):
            if draw(st.booleans()):
                # Bangla word
                word = draw(text(alphabet=bangla_chars, min_size=2, max_size=8))
            else:
                # English word
                word = draw(text(alphabet=english_chars, min_size=2, max_size=8))
            words.append(word)
        
        sentence = " ".join(words)
        # Add proper punctuation
        if draw(st.booleans()):
            sentence += "।"  # Bangla punctuation
        else:
            sentence += "."
            
        sentences.append(sentence)
    
    return " ".join(sentences)

@composite
def valid_metadata(draw):
    """Generate valid document metadata"""
    subjects = ["Physics", "Chemistry", "Mathematics", "Biology", "Bangla", "English"]
    
    return {
        "subject": draw(st.sampled_from(subjects)),
        "grade": draw(integers(min_value=6, max_value=12)),
        "chapter": draw(st.one_of(st.none(), integers(min_value=1, max_value=20))),
        "topic": draw(st.one_of(st.none(), text(min_size=3, max_size=50))),
        "language": draw(st.sampled_from(["bangla", "english"])),
        "page_number": draw(st.one_of(st.none(), integers(min_value=1, max_value=500))),
        "textbook_name": draw(st.one_of(st.none(), text(min_size=5, max_size=100))),
        "source_file": draw(text(min_size=5, max_size=50)) + ".pdf"
    }

@composite
def valid_filename(draw):
    """Generate valid filename following expected pattern"""
    subjects = ["physics", "chemistry", "mathematics", "biology", "bangla", "english"]
    subject = draw(st.sampled_from(subjects))
    grade = draw(integers(min_value=6, max_value=12))
    chapter = draw(integers(min_value=1, max_value=20))
    topic = draw(text(alphabet="abcdefghijklmnopqrstuvwxyz_", min_size=3, max_size=20))
    
    return f"{subject}_{grade}_{chapter}_{topic}.pdf"


def create_test_pdf(content: str) -> bytes:
    """Create a test PDF with given content"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Split content into lines that fit on page
    lines = content.split('\n')
    y_position = 750
    
    for line in lines:
        if y_position < 50:  # Start new page
            p.showPage()
            y_position = 750
        
        # Handle long lines by wrapping
        if len(line) > 80:
            words = line.split(' ')
            current_line = ""
            for word in words:
                if len(current_line + word) < 80:
                    current_line += word + " "
                else:
                    if current_line:
                        p.drawString(50, y_position, current_line.strip())
                        y_position -= 20
                    current_line = word + " "
            if current_line:
                p.drawString(50, y_position, current_line.strip())
                y_position -= 20
        else:
            p.drawString(50, y_position, line)
            y_position -= 20
    
    p.save()
    buffer.seek(0)
    return buffer.getvalue()


class TestDocumentProcessingProperties:
    """Property-based tests for document processing"""
    
    def setup_method(self):
        """Set up test environment"""
        self.processor = DocumentProcessor(chunk_size=500, chunk_overlap=100)
    
    @given(valid_text_content())
    @settings(max_examples=50, deadline=30000)
    def test_property_3_document_chunking_consistency(self, text_content):
        """
        **Feature: shikkhasathi-platform, Property 3: Document Chunking Consistency**
        
        For any valid text content, chunking should preserve all text content
        and maintain consistent metadata across chunks.
        **Validates: Requirements 1.1, 1.4**
        """
        assume(len(text_content.strip()) > 10)  # Ensure meaningful content
        
        # Create test metadata
        metadata = {
            "subject": "Physics",
            "grade": 9,
            "chapter": 1,
            "topic": "Test Topic",
            "language": "bangla",
            "page_number": 1,
            "textbook_name": "Test Book",
            "source_file": "test.pdf"
        }
        
        # Process text into chunks
        chunks = self.processor.chunk_text(text_content, metadata)
        
        # Property 1: All chunks should be non-empty
        assert all(len(chunk.content.strip()) > 0 for chunk in chunks), "All chunks must contain content"
        
        # Property 2: Metadata should be preserved in all chunks
        for chunk in chunks:
            assert chunk.metadata.subject == metadata["subject"]
            assert chunk.metadata.grade == metadata["grade"]
            assert chunk.metadata.chapter == metadata["chapter"]
            assert chunk.metadata.topic == metadata["topic"]
            assert chunk.metadata.language == metadata["language"]
            assert chunk.metadata.source_file == metadata["source_file"]
        
        # Property 3: Chunk indices should be sequential
        chunk_indices = [chunk.metadata.chunk_index for chunk in chunks]
        expected_indices = list(range(len(chunks)))
        assert chunk_indices == expected_indices, "Chunk indices must be sequential starting from 0"
        
        # Property 4: Each chunk should have a unique ID
        chunk_ids = [chunk.chunk_id for chunk in chunks]
        assert len(chunk_ids) == len(set(chunk_ids)), "All chunk IDs must be unique"
        
        # Property 5: Total content length should be preserved (allowing for overlap)
        total_chunk_content = "".join(chunk.content for chunk in chunks)
        # Due to overlap, total chunk content may be longer than original
        assert len(total_chunk_content) >= len(text_content), "Content should be preserved through chunking"
        
        # Property 6: Each chunk should respect size limits (with some tolerance)
        max_chunk_size = self.processor.chunk_size + 200  # Allow some tolerance
        for chunk in chunks:
            assert len(chunk.content) <= max_chunk_size, f"Chunk size {len(chunk.content)} exceeds limit {max_chunk_size}"
    
    @given(valid_filename())
    @settings(max_examples=30, deadline=15000)
    def test_metadata_extraction_consistency(self, filename):
        """
        Test that metadata extraction from filenames is consistent and follows expected patterns
        """
        metadata = self.processor.extract_metadata_from_filename(filename)
        
        # Property 1: Metadata should always contain required fields
        required_fields = ["subject", "grade", "language", "source_file"]
        for field in required_fields:
            assert field in metadata, f"Required field {field} missing from metadata"
        
        # Property 2: Grade should be a valid integer
        assert isinstance(metadata["grade"], int), "Grade must be an integer"
        assert 6 <= metadata["grade"] <= 12, "Grade must be between 6 and 12"
        
        # Property 3: Subject should be properly capitalized
        assert metadata["subject"].istitle(), "Subject should be title case"
        
        # Property 4: Source file should match input filename
        assert metadata["source_file"] == filename, "Source file should match input filename"
        
        # Property 5: Language should be valid
        assert metadata["language"] in ["bangla", "english"], "Language must be bangla or english"
    
    @given(valid_text_content())
    @settings(max_examples=30, deadline=20000)
    def test_language_detection_consistency(self, text_content):
        """
        Test that language detection is consistent and reasonable
        """
        assume(len(text_content.strip()) > 5)
        
        detected_language = self.processor.detect_language(text_content)
        
        # Property 1: Language detection should return valid values
        assert detected_language in ["bangla", "english"], "Language detection must return bangla or english"
        
        # Property 2: Detection should be consistent for same input
        second_detection = self.processor.detect_language(text_content)
        assert detected_language == second_detection, "Language detection must be consistent"
        
        # Property 3: Detection should be reasonable based on character content
        bangla_chars = len([c for c in text_content if '\u0980' <= c <= '\u09FF'])
        english_chars = len([c for c in text_content if c.isalpha() and c.isascii()])
        
        if bangla_chars > 0 and english_chars == 0:
            assert detected_language == "bangla", "Text with only Bangla characters should be detected as bangla"
        elif english_chars > 0 and bangla_chars == 0:
            assert detected_language == "english", "Text with only English characters should be detected as english"
    
    @given(valid_text_content(), valid_metadata())
    @settings(max_examples=20, deadline=25000)
    def test_document_processing_end_to_end_consistency(self, text_content, metadata):
        """
        Test end-to-end document processing consistency with PDF creation and processing
        """
        assume(len(text_content.strip()) > 20)  # Ensure substantial content
        
        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            try:
                # Create PDF content
                pdf_content = create_test_pdf(text_content)
                temp_file.write(pdf_content)
                temp_file.flush()
                
                # Process the PDF
                chunks = self.processor.process_document(temp_file.name)
                
                # Property 1: Processing should produce at least one chunk
                assert len(chunks) > 0, "Document processing must produce at least one chunk"
                
                # Property 2: All chunks should have valid metadata
                for chunk in chunks:
                    assert hasattr(chunk, 'metadata'), "Each chunk must have metadata"
                    assert hasattr(chunk, 'content'), "Each chunk must have content"
                    assert hasattr(chunk, 'chunk_id'), "Each chunk must have chunk_id"
                    assert len(chunk.content.strip()) > 0, "Each chunk must have non-empty content"
                
                # Property 3: Chunk IDs should be unique
                chunk_ids = [chunk.chunk_id for chunk in chunks]
                assert len(chunk_ids) == len(set(chunk_ids)), "All chunk IDs must be unique"
                
                # Property 4: Metadata should contain source file information
                for chunk in chunks:
                    assert chunk.metadata.source_file is not None, "Source file must be recorded"
                    assert chunk.metadata.page_number is not None, "Page number must be recorded"
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file.name)
    
    def test_document_validation_properties(self):
        """
        Test document validation properties
        """
        # Property 1: Non-existent files should be invalid
        assert not self.processor.validate_document("/nonexistent/file.pdf"), "Non-existent files should be invalid"
        
        # Property 2: Files with invalid extensions should be invalid
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp_file:
            try:
                temp_file.write(b"test content")
                temp_file.flush()
                assert not self.processor.validate_document(temp_file.name), "Invalid file extensions should be rejected"
            finally:
                os.unlink(temp_file.name)
        
        # Property 3: Valid PDF files should pass validation
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            try:
                pdf_content = create_test_pdf("Test content for validation")
                temp_file.write(pdf_content)
                temp_file.flush()
                assert self.processor.validate_document(temp_file.name), "Valid PDF files should pass validation"
            finally:
                os.unlink(temp_file.name)
    
    @given(integers(min_value=100, max_value=2000), integers(min_value=0, max_value=500))
    @settings(max_examples=20, deadline=10000)
    def test_chunking_parameters_consistency(self, chunk_size, chunk_overlap):
        """
        Test that different chunking parameters produce consistent results
        """
        assume(chunk_overlap < chunk_size)  # Overlap must be less than chunk size
        
        processor = DocumentProcessor(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        
        # Test with sample text
        test_text = "This is a test sentence. " * 100  # Create substantial text
        metadata = {
            "subject": "Test",
            "grade": 9,
            "language": "english",
            "source_file": "test.pdf",
            "page_number": 1
        }
        
        chunks = processor.chunk_text(test_text, metadata)
        
        # Property 1: Should produce at least one chunk
        assert len(chunks) > 0, "Must produce at least one chunk"
        
        # Property 2: Chunks should respect size constraints (with tolerance)
        for chunk in chunks:
            assert len(chunk.content) <= chunk_size + 200, f"Chunk size {len(chunk.content)} exceeds limit"
        
        # Property 3: Metadata should be consistent across all chunks
        for chunk in chunks:
            assert chunk.metadata.subject == metadata["subject"]
            assert chunk.metadata.grade == metadata["grade"]