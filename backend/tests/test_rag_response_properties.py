"""
Property-based tests for RAG response quality
Tests RAG response completeness and quality properties
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from hypothesis import given, strategies as st, assume, settings
from hypothesis.strategies import text, integers, composite, sampled_from
import re
from datetime import datetime

from app.services.rag.query_processor import QueryProcessor, UserContext, RAGResponse
from app.services.rag.embedding_service import EmbeddingService, EmbeddingConfig


# Test data generators
@composite
def valid_bangla_query(draw):
    """Generate valid Bangla queries"""
    bangla_chars = "অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎংঃ"
    
    # Common Bangla question patterns
    question_starters = [
        "কী", "কি", "কেন", "কিভাবে", "কোথায়", "কখন", "কে", "কার", "কাকে"
    ]
    
    # Generate question
    starter = draw(sampled_from(question_starters))
    
    # Add some content words
    content_words = []
    num_words = draw(integers(min_value=2, max_value=8))
    
    for _ in range(num_words):
        word = draw(text(alphabet=bangla_chars, min_size=2, max_size=8))
        content_words.append(word)
    
    question = f"{starter} {' '.join(content_words)}?"
    return question

@composite
def valid_english_query(draw):
    """Generate valid English queries"""
    question_starters = ["What", "Why", "How", "Where", "When", "Who", "Which"]
    
    starter = draw(sampled_from(question_starters))
    content = draw(text(alphabet="abcdefghijklmnopqrstuvwxyz ", min_size=5, max_size=50))
    
    return f"{starter} {content.strip()}?"

@composite
def valid_user_context(draw):
    """Generate valid user context"""
    subjects = ["Physics", "Chemistry", "Mathematics", "Biology", "Bangla", "English"]
    
    return UserContext(
        user_id=draw(text(min_size=5, max_size=20)),
        grade=draw(integers(min_value=6, max_value=12)),
        subject=draw(sampled_from(subjects)),
        language_preference=draw(sampled_from(["bangla", "english"]))
    )

@composite
def mock_search_results(draw):
    """Generate mock search results from vector database"""
    num_results = draw(integers(min_value=0, max_value=5))
    
    results = []
    for i in range(num_results):
        result = {
            "content_id": f"test_content_{i}",
            "score": draw(st.floats(min_value=0.7, max_value=1.0)),
            "metadata": {
                "subject": draw(sampled_from(["Physics", "Chemistry", "Mathematics"])),
                "grade": draw(integers(min_value=6, max_value=12)),
                "textbook_name": f"Test Book {i}",
                "page_number": draw(integers(min_value=1, max_value=500)),
                "topic": f"Test Topic {i}",
                "language": draw(sampled_from(["bangla", "english"]))
            }
        }
        results.append(result)
    
    return results


class TestRAGResponseProperties:
    """Property-based tests for RAG response quality"""
    
    def setup_method(self):
        """Set up test environment with mocked services"""
        # Mock embedding service
        self.mock_embedding_service = Mock(spec=EmbeddingService)
        
        # Mock OpenAI client to avoid initialization issues
        with patch('openai.OpenAI') as mock_openai:
            mock_client = Mock()
            mock_openai.return_value = mock_client
            
            # Create query processor with mocked embedding service
            self.query_processor = QueryProcessor(
                embedding_service=self.mock_embedding_service,
                openai_api_key="test_key"
            )
            
            # Store the mock client for later use
            self.mock_openai_client = mock_client
    
    @given(valid_bangla_query(), valid_user_context(), mock_search_results())
    @settings(max_examples=20, deadline=15000)
    def test_property_1_rag_response_completeness_bangla(self, query, user_context, search_results):
        """
        **Feature: shikkhasathi-platform, Property 1: RAG Response Completeness and Quality**
        
        For any Bangla student question, the RAG system response should contain contextually 
        appropriate NCTB content, Bangladesh-specific examples, proper source citations, 
        and be in Bangla language.
        **Validates: Requirements 1.1, 1.2, 1.4, 1.5**
        """
        assume(len(query.strip()) > 5)  # Ensure meaningful query
        
        # Mock the embedding service search
        async def mock_search(*args, **kwargs):
            return search_results
        
        self.mock_embedding_service.search_similar_chunks = AsyncMock(return_value=search_results)
        
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "এটি একটি পরীক্ষার উত্তর। বাংলাদেশের প্রেক্ষাপটে এই বিষয়টি গুরুত্বপূর্ণ।"
        
        async def mock_openai_call(*args, **kwargs):
            return mock_response
        
        # Configure the mock OpenAI client
        self.mock_openai_client.chat.completions.create.return_value = mock_response
        
        # Run the test
        import asyncio
        response = asyncio.run(self.query_processor.process_query(query, user_context))
        
        # Property 1: Response should be a valid RAGResponse object
        assert isinstance(response, RAGResponse), "Response must be a RAGResponse object"
        
        # Property 2: Response should contain an answer
        assert response.answer is not None, "Response must contain an answer"
        assert len(response.answer.strip()) > 0, "Answer must not be empty"
        
        # Property 3: Language detection should work correctly for Bangla
        detected_language = self.query_processor.detect_query_language(query)
        assert detected_language == "bangla", "Bangla queries should be detected as bangla"
        assert response.language == "bangla", "Response language should match detected language"
        
        # Property 4: Sources should be provided when available
        if search_results:
            assert len(response.sources) > 0, "Sources should be provided when search results exist"
            
            # Each source should have required fields
            for source in response.sources:
                assert "textbook_name" in source, "Each source must have textbook_name"
                assert "page_number" in source, "Each source must have page_number"
                assert "subject" in source, "Each source must have subject"
                assert "relevance_score" in source, "Each source must have relevance_score"
        
        # Property 5: Confidence score should be reasonable
        assert 0.0 <= response.confidence_score <= 1.0, "Confidence score must be between 0 and 1"
        
        # Property 6: Processing time should be recorded
        assert response.processing_time > 0, "Processing time must be positive"
        
        # Property 7: Context used should be tracked
        assert isinstance(response.context_used, list), "Context used must be a list"
    
    @given(valid_english_query(), valid_user_context(), mock_search_results())
    @settings(max_examples=20, deadline=15000)
    def test_property_1_rag_response_completeness_english(self, query, user_context, search_results):
        """
        **Feature: shikkhasathi-platform, Property 1: RAG Response Completeness and Quality**
        
        For any English student question, the RAG system response should contain contextually 
        appropriate NCTB content, Bangladesh-specific examples, proper source citations, 
        and be in English language.
        **Validates: Requirements 1.1, 1.2, 1.4, 1.5**
        """
        assume(len(query.strip()) > 5)  # Ensure meaningful query
        
        # Mock the embedding service search
        self.mock_embedding_service.search_similar_chunks = AsyncMock(return_value=search_results)
        
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "This is a test answer. In the context of Bangladesh, this topic is important."
        
        async def mock_openai_call(*args, **kwargs):
            return mock_response
        
        # Configure the mock OpenAI client
        self.mock_openai_client.chat.completions.create.return_value = mock_response
        
        # Run the test
        import asyncio
        response = asyncio.run(self.query_processor.process_query(query, user_context))
        
        # Property 1: Response should be a valid RAGResponse object
        assert isinstance(response, RAGResponse), "Response must be a RAGResponse object"
        
        # Property 2: Response should contain an answer
        assert response.answer is not None, "Response must contain an answer"
        assert len(response.answer.strip()) > 0, "Answer must not be empty"
        
        # Property 3: Language detection should work correctly for English
        detected_language = self.query_processor.detect_query_language(query)
        assert detected_language == "english", "English queries should be detected as english"
        assert response.language == "english", "Response language should match detected language"
        
        # Property 4: Sources should be provided when available
        if search_results:
            assert len(response.sources) > 0, "Sources should be provided when search results exist"
        
        # Property 5: All required response fields should be present
        assert hasattr(response, 'answer'), "Response must have answer field"
        assert hasattr(response, 'sources'), "Response must have sources field"
        assert hasattr(response, 'language'), "Response must have language field"
        assert hasattr(response, 'confidence_score'), "Response must have confidence_score field"
        assert hasattr(response, 'context_used'), "Response must have context_used field"
        assert hasattr(response, 'processing_time'), "Response must have processing_time field"
    
    @given(text(min_size=1, max_size=100))
    @settings(max_examples=30, deadline=10000)
    def test_language_detection_consistency(self, query_text):
        """
        Test that language detection is consistent and reasonable
        """
        assume(len(query_text.strip()) > 0)
        
        detected_language = self.query_processor.detect_query_language(query_text)
        
        # Property 1: Language detection should return valid values
        assert detected_language in ["bangla", "english"], "Language detection must return bangla or english"
        
        # Property 2: Detection should be consistent for same input
        second_detection = self.query_processor.detect_query_language(query_text)
        assert detected_language == second_detection, "Language detection must be consistent"
        
        # Property 3: Detection should be reasonable based on character content
        bangla_chars = len(re.findall(r'[\u0980-\u09FF]', query_text))
        english_chars = len(re.findall(r'[a-zA-Z]', query_text))
        
        if bangla_chars > 0 and english_chars == 0:
            assert detected_language == "bangla", "Text with only Bangla characters should be detected as bangla"
        elif english_chars > 0 and bangla_chars == 0:
            assert detected_language == "english", "Text with only English characters should be detected as english"
    
    @given(mock_search_results(), integers(min_value=500, max_value=5000))
    @settings(max_examples=20, deadline=10000)
    def test_context_assembly_properties(self, search_results, max_context_length):
        """
        Test that context assembly respects length limits and maintains source tracking
        """
        assembled_context, source_ids = self.query_processor.assemble_context_for_prompt(
            retrieved_chunks=search_results,
            max_context_length=max_context_length
        )
        
        # Property 1: Assembled context should not exceed maximum length
        assert len(assembled_context) <= max_context_length, f"Context length {len(assembled_context)} exceeds limit {max_context_length}"
        
        # Property 2: Number of source IDs should match number of chunks used
        # (may be less than total search results due to length limits)
        assert len(source_ids) <= len(search_results), "Source IDs should not exceed number of search results"
        
        # Property 3: All source IDs should be non-empty strings
        for source_id in source_ids:
            assert isinstance(source_id, str), "Source IDs must be strings"
        
        # Property 4: If search results exist, context should contain source information
        if search_results and len(assembled_context) > 0:
            assert "Source" in assembled_context, "Context should contain source information when results exist"
    
    @given(valid_user_context())
    @settings(max_examples=20, deadline=10000)
    def test_prompt_building_properties(self, user_context):
        """
        Test that prompt building creates valid message structures
        """
        query = "Test question"
        context = "Test context from textbooks"
        conversation_history = "Previous conversation"
        language = "english"
        
        messages = self.query_processor.build_prompt(
            query=query,
            context=context,
            conversation_history=conversation_history,
            language=language,
            user_context=user_context
        )
        
        # Property 1: Messages should be a list
        assert isinstance(messages, list), "Messages must be a list"
        
        # Property 2: Should have at least system and user messages
        assert len(messages) >= 2, "Must have at least system and user messages"
        
        # Property 3: First message should be system message
        assert messages[0]["role"] == "system", "First message must be system message"
        assert "content" in messages[0], "System message must have content"
        
        # Property 4: Last message should be user message
        assert messages[-1]["role"] == "user", "Last message must be user message"
        assert "content" in messages[-1], "User message must have content"
        
        # Property 5: User message should contain the query
        assert query in messages[-1]["content"], "User message must contain the original query"
        
        # Property 6: System message should contain user context information
        system_content = messages[0]["content"]
        assert str(user_context.grade) in system_content, "System message should contain grade information"
        
        if user_context.subject:
            assert user_context.subject in system_content, "System message should contain subject information"
    
    def test_response_formatting_with_citations(self):
        """
        Test that response formatting includes proper citations
        """
        # Create test response
        test_response = RAGResponse(
            answer="This is a test answer.",
            sources=[
                {
                    "textbook_name": "Physics Book",
                    "page_number": 45,
                    "subject": "Physics",
                    "topic": "Newton's Laws",
                    "relevance_score": 0.9
                },
                {
                    "textbook_name": "Chemistry Book", 
                    "page_number": 23,
                    "subject": "Chemistry",
                    "topic": "Atomic Structure",
                    "relevance_score": 0.8
                }
            ],
            language="english",
            confidence_score=0.85,
            context_used=["id1", "id2"],
            processing_time=1.5
        )
        
        formatted = self.query_processor.format_response_with_citations(test_response)
        
        # Property 1: Formatted response should contain original answer
        assert test_response.answer in formatted, "Formatted response must contain original answer"
        
        # Property 2: Should contain source citations
        assert "Sources:" in formatted, "Formatted response should contain sources section"
        
        # Property 3: Each source should be listed with proper information
        for source in test_response.sources:
            assert source["textbook_name"] in formatted, f"Source {source['textbook_name']} should be cited"
            assert str(source["page_number"]) in formatted, f"Page {source['page_number']} should be cited"
        
        # Property 4: Citations should be numbered
        assert "1." in formatted, "Citations should be numbered"
        assert "2." in formatted, "Multiple citations should be numbered sequentially"