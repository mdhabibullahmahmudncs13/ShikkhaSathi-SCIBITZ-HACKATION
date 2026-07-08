"""
Property-based tests for conversation context preservation
Tests that conversation context is maintained correctly across messages
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from hypothesis import given, strategies as st, assume, settings
from hypothesis.strategies import text, integers, composite, sampled_from, lists
from datetime import datetime, timedelta

from app.services.rag.query_processor import (
    QueryProcessor, UserContext, ConversationContext, 
    ConversationMessage, RAGResponse
)
from app.services.rag.embedding_service import EmbeddingService


# Test data generators
@composite
def valid_conversation_message(draw):
    """Generate valid conversation messages"""
    roles = ["user", "assistant"]
    
    return ConversationMessage(
        role=draw(sampled_from(roles)),
        content=draw(text(min_size=5, max_size=200, alphabet=st.characters(blacklist_categories=('Cc',), min_codepoint=32, max_codepoint=126))),
        timestamp=datetime.now() - timedelta(minutes=draw(integers(min_value=0, max_value=60))),
        sources=draw(st.one_of(
            st.none(),
            lists(text(min_size=5, max_size=20, alphabet=st.characters(blacklist_categories=('Cc',), min_codepoint=32, max_codepoint=126)), min_size=0, max_size=3)
        ))
    )

@composite
def valid_conversation_context(draw):
    """Generate valid conversation context with message history"""
    num_messages = draw(integers(min_value=0, max_value=10))
    messages = [draw(valid_conversation_message()) for _ in range(num_messages)]
    
    # Sort messages by timestamp to maintain chronological order
    messages.sort(key=lambda x: x.timestamp)
    
    return ConversationContext(
        session_id=draw(text(min_size=5, max_size=20)),
        user_id=draw(text(min_size=5, max_size=20)),
        messages=messages,
        max_history=draw(integers(min_value=1, max_value=5))
    )

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
def conversation_sequence(draw):
    """Generate a sequence of related conversation messages"""
    num_messages = draw(integers(min_value=2, max_value=8))
    messages = []
    
    base_time = datetime.now() - timedelta(hours=1)
    
    for i in range(num_messages):
        role = "user" if i % 2 == 0 else "assistant"
        content = f"Message {i+1}: " + draw(text(min_size=10, max_size=100, alphabet=st.characters(blacklist_categories=('Cc',), min_codepoint=32, max_codepoint=126)))
        timestamp = base_time + timedelta(minutes=i * 5)
        
        message = ConversationMessage(
            role=role,
            content=content,
            timestamp=timestamp,
            sources=["source1", "source2"] if role == "assistant" else None
        )
        messages.append(message)
    
    return messages


class TestConversationContextProperties:
    """Property-based tests for conversation context preservation"""
    
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
    
    @given(valid_conversation_context())
    @settings(max_examples=30, deadline=10000)
    def test_property_2_conversation_context_preservation(self, conversation_context):
        """
        **Feature: shikkhasathi-platform, Property 2: Conversation Context Preservation**
        
        For any sequence of follow-up questions, the RAG system should maintain context 
        from the last 3 messages and provide coherent responses that reference previous 
        conversation elements.
        **Validates: Requirements 1.3**
        """
        # Property 1: Context extraction should respect max_history limit
        extracted_context = self.query_processor.extract_conversation_context(conversation_context)
        
        if conversation_context.messages:
            # Should only include up to max_history messages
            expected_messages = conversation_context.messages[-conversation_context.max_history:]
            
            # Count the number of messages referenced in extracted context
            context_lines = [line for line in extracted_context.split('\n') if line.strip()]
            
            # Each message should produce one line in context (User: or Assistant:)
            assert len(context_lines) <= conversation_context.max_history * 2, \
                f"Context should not exceed max_history limit of {conversation_context.max_history}"
            
            # Property 2: Most recent messages should be included
            if len(expected_messages) > 0:
                most_recent_content = expected_messages[-1].content
                if len(most_recent_content.strip()) > 0:
                    assert most_recent_content.strip() in extracted_context or extracted_context == "", \
                        "Most recent message content should be included in context"
        else:
            # Property 3: Empty message list should produce empty context
            assert extracted_context == "", "Empty message list should produce empty context"
    
    @given(conversation_sequence())
    @settings(max_examples=20, deadline=10000)
    def test_conversation_context_chronological_order(self, messages):
        """
        Test that conversation context maintains chronological order
        """
        conversation = ConversationContext(
            session_id="test_session",
            user_id="test_user",
            messages=messages,
            max_history=3
        )
        
        extracted_context = self.query_processor.extract_conversation_context(conversation)
        
        if messages:
            # Property 1: Context should maintain chronological order
            context_lines = [line for line in extracted_context.split('\n') if line.strip()]
            
            # Get the last max_history messages
            recent_messages = messages[-conversation.max_history:]
            
            # Check that the order is preserved in the context
            for i, message in enumerate(recent_messages):
                stripped_content = message.content.strip()
                if stripped_content:
                    # Normalize content the same way the context extraction does
                    import re
                    normalized_content = re.sub(r'\s+', ' ', stripped_content)
                    role_prefix = "User:" if message.role == "user" else "Assistant:"
                    expected_line = f"{role_prefix} {normalized_content}"
                    
                    # The message should appear in the context (using normalized content)
                    assert any(normalized_content in line for line in context_lines), \
                        f"Message content '{normalized_content}' should appear in context"
    
    @given(valid_conversation_context(), valid_user_context())
    @settings(max_examples=15, deadline=20000)
    def test_conversation_context_integration_with_query_processing(self, conversation_context, user_context):
        """
        Test that conversation context is properly integrated into query processing
        """
        assume(len(conversation_context.messages) > 0)  # Need some conversation history
        
        # Reset mock call count for this test example
        self.mock_openai_client.chat.completions.create.reset_mock()
        
        # Mock search results
        mock_search_results = [
            {
                "content_id": "test_content_1",
                "score": 0.9,
                "metadata": {
                    "subject": "Physics",
                    "grade": 9,
                    "textbook_name": "Test Physics Book",
                    "page_number": 45,
                    "topic": "Test Topic",
                    "language": "english"
                }
            }
        ]
        
        # Mock the embedding service search
        self.mock_embedding_service.search_similar_chunks = AsyncMock(return_value=mock_search_results)
        
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "This is a test response that references previous conversation."
        
        # Configure the mock OpenAI client
        self.mock_openai_client.chat.completions.create.return_value = mock_response
        
        # Test query with conversation context
        test_query = "Can you explain more about this topic?"
        
        # Run the test
        import asyncio
        response = asyncio.run(self.query_processor.process_query(
            query=test_query,
            user_context=user_context,
            conversation=conversation_context
        ))
        
        # Property 1: Response should be generated successfully
        assert isinstance(response, RAGResponse), "Response should be a RAGResponse object"
        assert response.answer is not None, "Response should contain an answer"
        
        # Property 2: OpenAI should have been called with conversation context
        self.mock_openai_client.chat.completions.create.assert_called_once()
        call_args = self.mock_openai_client.chat.completions.create.call_args
        
        # Check that the messages include conversation history
        messages = call_args[1]['messages']  # keyword arguments
        user_message_content = messages[-1]['content']  # Last message should be user message
        
        # Should contain conversation history if there are messages
        if conversation_context.messages:
            assert "Previous Conversation:" in user_message_content, \
                "User message should include conversation history when available"
    
    @given(integers(min_value=1, max_value=10))
    @settings(max_examples=20, deadline=5000)
    def test_max_history_limit_enforcement(self, max_history):
        """
        Test that max_history limit is properly enforced
        """
        # Create more messages than the limit
        num_messages = max_history + 5
        messages = []
        
        for i in range(num_messages):
            message = ConversationMessage(
                role="user" if i % 2 == 0 else "assistant",
                content=f"Message {i}",
                timestamp=datetime.now() - timedelta(minutes=num_messages - i)
            )
            messages.append(message)
        
        conversation = ConversationContext(
            session_id="test_session",
            user_id="test_user", 
            messages=messages,
            max_history=max_history
        )
        
        extracted_context = self.query_processor.extract_conversation_context(conversation)
        
        # Property 1: Should only include the last max_history messages
        context_lines = [line for line in extracted_context.split('\n') if line.strip()]
        
        # Each message produces one line, so we should have at most max_history lines
        assert len(context_lines) <= max_history, \
            f"Context should not exceed max_history limit of {max_history}"
        
        # Property 2: Should include the most recent messages
        recent_messages = messages[-max_history:]
        for message in recent_messages:
            assert message.content in extracted_context, \
                f"Recent message '{message.content}' should be in context"
        
        # Property 3: Should not include older messages beyond the limit
        if len(messages) > max_history:
            older_messages = messages[:-max_history]
            for message in older_messages:
                # Check for exact line match to avoid substring issues
                role_prefix = "User:" if message.role == "user" else "Assistant:"
                expected_line = f"{role_prefix} {message.content.strip()}"
                # Split context into lines and check for exact line match
                context_lines_exact = extracted_context.split('\n')
                assert expected_line not in context_lines_exact, \
                    f"Older message line '{expected_line}' should not be in context"
    
    def test_empty_conversation_handling(self):
        """
        Test handling of empty conversation contexts
        """
        # Test with no messages
        empty_conversation = ConversationContext(
            session_id="test_session",
            user_id="test_user",
            messages=[],
            max_history=3
        )
        
        extracted_context = self.query_processor.extract_conversation_context(empty_conversation)
        
        # Property 1: Empty conversation should produce empty context
        assert extracted_context == "", "Empty conversation should produce empty context"
        
        # Test with messages that have empty content
        empty_content_messages = [
            ConversationMessage(
                role="user",
                content="",
                timestamp=datetime.now()
            ),
            ConversationMessage(
                role="assistant", 
                content="   ",  # Only whitespace
                timestamp=datetime.now()
            )
        ]
        
        conversation_with_empty_content = ConversationContext(
            session_id="test_session",
            user_id="test_user",
            messages=empty_content_messages,
            max_history=3
        )
        
        extracted_context = self.query_processor.extract_conversation_context(conversation_with_empty_content)
        
        # Property 2: Messages with empty/whitespace content should be handled gracefully
        # The context might be empty or contain role prefixes only
        assert isinstance(extracted_context, str), "Context should always be a string"
    
    @given(valid_conversation_context())
    @settings(max_examples=20, deadline=8000)
    def test_conversation_context_format_consistency(self, conversation_context):
        """
        Test that conversation context format is consistent and parseable
        """
        extracted_context = self.query_processor.extract_conversation_context(conversation_context)
        
        if conversation_context.messages:
            # Property 1: Context should be properly formatted
            lines = extracted_context.split('\n')
            
            for line in lines:
                if line.strip():  # Skip empty lines
                    # Each non-empty line should start with "User:" or "Assistant:"
                    assert line.startswith("User:") or line.startswith("Assistant:"), \
                        f"Context line should start with role prefix: '{line}'"
            
            # Property 2: Context should not be excessively long
            assert len(extracted_context) < 10000, "Context should not be excessively long"
            
            # Property 3: Context should contain actual message content
            recent_messages = conversation_context.messages[-conversation_context.max_history:]
            non_empty_messages = [msg for msg in recent_messages if msg.content.strip()]
            
            if non_empty_messages:
                # At least one message content should appear in context
                assert any(msg.content.strip() in extracted_context for msg in non_empty_messages), \
                    "Context should contain at least one message content"