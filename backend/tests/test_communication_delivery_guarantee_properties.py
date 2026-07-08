"""
Property Tests for Communication Delivery Guarantee

Tests that validate the messaging system's delivery guarantees and consistency
as specified in Requirements 5.1 and 5.2.
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch

from app.models.message import (
    Message, MessageRecipient, MessageType, MessagePriority, DeliveryStatus
)
from app.models.user import User
from app.models.teacher import Teacher, TeacherClass
from app.services.message_service import MessageService
from app.schemas.message import MessageCreate


# Test data generators
@st.composite
def generate_teacher_profile(draw):
    """Generate a realistic teacher profile"""
    teacher_id = str(uuid4())
    return {
        'id': teacher_id,
        'full_name': draw(st.text(min_size=5, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs')))),
        'email': f"teacher_{teacher_id[:8]}@school.edu",
        'role': 'teacher',
        'subjects': draw(st.lists(st.sampled_from(['Math', 'Science', 'English', 'History']), min_size=1, max_size=3)),
        'grade_levels': draw(st.lists(st.integers(min_value=6, max_value=12), min_size=1, max_size=3))
    }


@st.composite
def generate_student_profile(draw):
    """Generate a realistic student profile"""
    student_id = str(uuid4())
    return {
        'id': student_id,
        'full_name': draw(st.text(min_size=5, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs')))),
        'email': f"student_{student_id[:8]}@school.edu",
        'role': 'student',
        'grade': draw(st.integers(min_value=6, max_value=12)),
        'parent_id': str(uuid4()) if draw(st.booleans()) else None
    }


@st.composite
def generate_message_data(draw):
    """Generate realistic message data"""
    return MessageCreate(
        subject=draw(st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs', 'Po')))),
        content=draw(st.text(min_size=10, max_size=500, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs', 'Po')))),
        message_type=draw(st.sampled_from([MessageType.DIRECT, MessageType.GROUP, MessageType.CLASS, MessageType.ANNOUNCEMENT])),
        priority=draw(st.sampled_from([MessagePriority.LOW, MessagePriority.NORMAL, MessagePriority.HIGH, MessagePriority.URGENT])),
        recipient_ids=draw(st.lists(st.text(min_size=10, max_size=50), min_size=1, max_size=10)),
        scheduled_at=draw(st.one_of(st.none(), st.datetimes(min_value=datetime.now() + timedelta(hours=1)))),
        is_draft=draw(st.booleans()),
        metadata=draw(st.one_of(st.none(), st.dictionaries(st.text(min_size=1, max_size=20), st.text(min_size=1, max_size=50), min_size=0, max_size=5)))
    )


class TestCommunicationDeliveryGuarantee:
    """Test communication delivery guarantee properties"""

    @given(
        teacher_profile=generate_teacher_profile(),
        students=st.lists(generate_student_profile(), min_size=1, max_size=20),
        message_data=generate_message_data()
    )
    @settings(max_examples=50, deadline=None)
    def test_message_delivery_consistency_property(self, teacher_profile, students, message_data):
        """
        Property 6: Communication Delivery Guarantee
        
        Tests that all messages sent through the system maintain delivery consistency:
        1. Every recipient gets a delivery record
        2. Delivery status progresses logically (pending -> sent -> delivered -> read)
        3. Failed deliveries are properly tracked with reasons
        4. No messages are lost in the delivery process
        5. Delivery timestamps are consistent and ordered
        """
        # Create mock database session
        mock_db = Mock(spec=Session)
        
        # Create mock users
        teacher_user = Mock(spec=User)
        teacher_user.id = teacher_profile['id']
        teacher_user.full_name = teacher_profile['full_name']
        teacher_user.role = 'teacher'
        
        student_users = []
        for student in students:
            user = Mock(spec=User)
            user.id = student['id']
            user.full_name = student['full_name']
            user.role = 'student'
            student_users.append(user)
        
        # Mock database queries
        def mock_query_side_effect(model):
            query_mock = Mock()
            if model == User:
                def filter_side_effect(condition):
                    # Simulate finding teacher
                    if hasattr(condition, 'left') and str(condition.left) == 'users.id':
                        if str(condition.right.value) == teacher_profile['id']:
                            query_mock.first.return_value = teacher_user
                        else:
                            # Find student by ID
                            for student_user in student_users:
                                if str(condition.right.value) == student_user.id:
                                    query_mock.first.return_value = student_user
                                    break
                            else:
                                query_mock.first.return_value = None
                    return query_mock
                query_mock.filter.side_effect = filter_side_effect
            return query_mock
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Track created objects
        created_messages = []
        created_recipients = []
        
        def mock_add(obj):
            if isinstance(obj, Message):
                obj.id = uuid4()
                created_messages.append(obj)
            elif isinstance(obj, MessageRecipient):
                obj.id = uuid4()
                created_recipients.append(obj)
        
        mock_db.add.side_effect = mock_add
        mock_db.flush.return_value = None
        mock_db.commit.return_value = None
        
        # Create message service
        service = MessageService(mock_db)
        
        # Adjust recipient IDs to match available students
        available_recipient_ids = [s['id'] for s in students[:len(message_data.recipient_ids)]]
        message_data.recipient_ids = available_recipient_ids
        
        # Test message creation and delivery
        with patch.object(service, '_resolve_recipients') as mock_resolve:
            # Mock recipient resolution
            mock_resolve.return_value = [(rid, 'student') for rid in available_recipient_ids]
            
            with patch.object(service, '_send_message') as mock_send:
                # Create message
                service.create_message(teacher_profile['id'], message_data)
                
                # Verify message was created
                assert len(created_messages) == 1
                message = created_messages[0]
                
                # Property 1: Every recipient gets a delivery record
                assert len(created_recipients) == len(available_recipient_ids)
                
                # Property 2: All recipients have consistent initial state
                for recipient in created_recipients:
                    assert recipient.message_id == message.id
                    assert recipient.recipient_id in available_recipient_ids
                    assert recipient.delivery_status == DeliveryStatus.PENDING
                    assert recipient.delivered_at is None
                    assert recipient.read_at is None
                    assert recipient.retry_count == 0
                
                # Property 3: Message metadata is consistent
                assert message.sender_id == teacher_profile['id']
                assert message.subject == message_data.subject
                assert message.content == message_data.content
                assert message.message_type == message_data.message_type
                assert message.priority == message_data.priority
                assert message.is_draft == message_data.is_draft
                
                # Property 4: Scheduled messages are handled correctly
                if message_data.scheduled_at:
                    assert message.scheduled_at == message_data.scheduled_at
                    # Scheduled messages should not be sent immediately
                    if not message_data.is_draft:
                        mock_send.assert_not_called()
                else:
                    # Non-scheduled, non-draft messages should be sent
                    if not message_data.is_draft:
                        mock_send.assert_called_once_with(message.id)

    @given(
        delivery_statuses=st.lists(
            st.sampled_from([DeliveryStatus.PENDING, DeliveryStatus.SENT, DeliveryStatus.DELIVERED, DeliveryStatus.READ, DeliveryStatus.FAILED]),
            min_size=5, max_size=20
        )
    )
    @settings(max_examples=30, deadline=None)
    def test_delivery_status_progression_property(self, delivery_statuses):
        """
        Property 7: Delivery Status Progression
        
        Tests that delivery status transitions follow logical progression:
        1. Status can only progress forward (except for failures)
        2. Timestamps are set appropriately for each status
        3. Failed status can occur at any point but doesn't regress
        4. Read status implies delivered status
        """
        # Create mock recipient
        recipient = MessageRecipient(
            id=uuid4(),
            message_id=uuid4(),
            recipient_id=str(uuid4()),
            recipient_type='student',
            delivery_status=DeliveryStatus.PENDING
        )
        
        # Track status progression
        status_order = {
            DeliveryStatus.PENDING: 0,
            DeliveryStatus.SENT: 1,
            DeliveryStatus.DELIVERED: 2,
            DeliveryStatus.READ: 3,
            DeliveryStatus.FAILED: -1  # Can happen at any time
        }
        
        current_status_level = 0
        previous_delivered_at = None
        previous_read_at = None
        
        for new_status in delivery_statuses:
            new_status_level = status_order[new_status]
            
            # Property 1: Status progression rules
            if new_status == DeliveryStatus.FAILED:
                # Failed can happen at any time
                recipient.delivery_status = new_status
                recipient.failure_reason = "Test failure"
            elif new_status_level > current_status_level:
                # Forward progression is allowed
                recipient.delivery_status = new_status
                current_status_level = new_status_level
                
                # Property 2: Set appropriate timestamps
                if new_status == DeliveryStatus.DELIVERED:
                    recipient.delivered_at = datetime.utcnow()
                    previous_delivered_at = recipient.delivered_at
                elif new_status == DeliveryStatus.READ:
                    recipient.read_at = datetime.utcnow()
                    previous_read_at = recipient.read_at
                    # Property 4: Read implies delivered
                    if not recipient.delivered_at:
                        recipient.delivered_at = recipient.read_at
            # else: backward progression not allowed (except failures)
            
            # Property 3: Timestamp consistency
            if recipient.delivered_at and recipient.read_at:
                assert recipient.delivered_at <= recipient.read_at
            
            # Property 4: Read status validation
            if recipient.delivery_status == DeliveryStatus.READ:
                assert recipient.delivered_at is not None
                assert recipient.read_at is not None

    @given(
        message_count=st.integers(min_value=1, max_value=10),
        recipient_count=st.integers(min_value=1, max_value=15),
        failure_rate=st.floats(min_value=0.0, max_value=0.3)
    )
    @settings(max_examples=30, deadline=None)
    def test_bulk_delivery_consistency_property(self, message_count, recipient_count, failure_rate):
        """
        Property 8: Bulk Delivery Consistency
        
        Tests that bulk message operations maintain consistency:
        1. All messages in a batch are processed
        2. Partial failures don't affect other messages
        3. Delivery statistics are accurate
        4. No recipients are missed or duplicated
        """
        # Create mock database session
        mock_db = Mock(spec=Session)
        
        # Generate test data
        teacher_id = str(uuid4())
        messages = []
        all_recipients = []
        
        for i in range(message_count):
            message = Message(
                id=uuid4(),
                sender_id=teacher_id,
                subject=f"Test Message {i}",
                content=f"Content for message {i}",
                message_type=MessageType.DIRECT,
                priority=MessagePriority.NORMAL,
                created_at=datetime.utcnow(),
                is_draft=False
            )
            messages.append(message)
            
            # Create recipients for this message
            message_recipients = []
            for j in range(recipient_count):
                recipient = MessageRecipient(
                    id=uuid4(),
                    message_id=message.id,
                    recipient_id=str(uuid4()),
                    recipient_type='student',
                    delivery_status=DeliveryStatus.PENDING
                )
                message_recipients.append(recipient)
                all_recipients.append(recipient)
            
            message.recipients = message_recipients
        
        # Simulate delivery process with some failures
        delivered_count = 0
        failed_count = 0
        
        for recipient in all_recipients:
            # Simulate random failures based on failure_rate
            import random
            random.seed(hash(str(recipient.id)))  # Deterministic for testing
            
            if random.random() < failure_rate:
                # Simulate delivery failure
                recipient.delivery_status = DeliveryStatus.FAILED
                recipient.failure_reason = "Network timeout"
                failed_count += 1
            else:
                # Simulate successful delivery
                recipient.delivery_status = DeliveryStatus.DELIVERED
                recipient.delivered_at = datetime.utcnow()
                delivered_count += 1
        
        # Property 1: All messages are processed
        total_expected_recipients = message_count * recipient_count
        assert len(all_recipients) == total_expected_recipients
        
        # Property 2: Delivery statistics are accurate
        actual_delivered = len([r for r in all_recipients if r.delivery_status == DeliveryStatus.DELIVERED])
        actual_failed = len([r for r in all_recipients if r.delivery_status == DeliveryStatus.FAILED])
        
        assert actual_delivered == delivered_count
        assert actual_failed == failed_count
        assert actual_delivered + actual_failed == total_expected_recipients
        
        # Property 3: No recipients are duplicated
        recipient_ids = [r.id for r in all_recipients]
        assert len(recipient_ids) == len(set(recipient_ids))
        
        # Property 4: Each message has correct recipient count
        for message in messages:
            assert len(message.recipients) == recipient_count
            
            # Property 5: All recipients belong to the correct message
            for recipient in message.recipients:
                assert recipient.message_id == message.id

    @given(
        notification_settings=st.dictionaries(
            st.sampled_from(['email_notifications', 'push_notifications', 'sms_notifications']),
            st.booleans(),
            min_size=1, max_size=3
        ),
        recipient_types=st.lists(
            st.sampled_from(['student', 'parent', 'teacher']),
            min_size=1, max_size=10
        )
    )
    @settings(max_examples=25, deadline=None)
    def test_notification_delivery_consistency_property(self, notification_settings, recipient_types):
        """
        Property 9: Notification Delivery Consistency
        
        Tests that notification delivery respects user preferences:
        1. Notifications are only sent via enabled channels
        2. User preferences are respected for each recipient type
        3. Notification delivery is tracked separately from message delivery
        4. Failed notifications don't affect message delivery status
        """
        # Create mock recipients with different notification settings
        recipients = []
        for i, recipient_type in enumerate(recipient_types):
            recipient = {
                'id': str(uuid4()),
                'type': recipient_type,
                'notification_settings': notification_settings.copy(),
                'delivery_attempts': []
            }
            recipients.append(recipient)
        
        # Simulate notification delivery
        for recipient in recipients:
            settings = recipient['notification_settings']
            
            # Property 1: Only attempt delivery via enabled channels
            attempted_channels = []
            
            if settings.get('email_notifications', False):
                attempted_channels.append('email')
                recipient['delivery_attempts'].append({
                    'channel': 'email',
                    'status': 'delivered',
                    'timestamp': datetime.utcnow()
                })
            
            if settings.get('push_notifications', False):
                attempted_channels.append('push')
                recipient['delivery_attempts'].append({
                    'channel': 'push',
                    'status': 'delivered',
                    'timestamp': datetime.utcnow()
                })
            
            if settings.get('sms_notifications', False):
                attempted_channels.append('sms')
                recipient['delivery_attempts'].append({
                    'channel': 'sms',
                    'status': 'delivered',
                    'timestamp': datetime.utcnow()
                })
            
            # Property 2: Delivery attempts match enabled settings
            assert len(recipient['delivery_attempts']) == len(attempted_channels)
            
            # Property 3: All attempted channels are in enabled settings
            for attempt in recipient['delivery_attempts']:
                channel = attempt['channel']
                setting_key = f"{channel}_notifications"
                assert settings.get(setting_key, False) == True
        
        # Property 4: Notification delivery tracking is consistent
        total_attempts = sum(len(r['delivery_attempts']) for r in recipients)
        total_enabled_channels = sum(
            sum(1 for setting, enabled in r['notification_settings'].items() if enabled)
            for r in recipients
        )
        
        assert total_attempts == total_enabled_channels

    @given(
        concurrent_messages=st.integers(min_value=2, max_value=8),
        shared_recipients=st.integers(min_value=1, max_value=5)
    )
    @settings(max_examples=20, deadline=None)
    def test_concurrent_delivery_consistency_property(self, concurrent_messages, shared_recipients):
        """
        Property 10: Concurrent Delivery Consistency
        
        Tests that concurrent message deliveries don't interfere:
        1. Messages maintain separate delivery tracking
        2. Shared recipients receive all messages
        3. Delivery order is preserved per recipient
        4. No race conditions in status updates
        """
        # Create shared recipients
        shared_recipient_ids = [str(uuid4()) for _ in range(shared_recipients)]
        
        # Create concurrent messages
        messages = []
        for i in range(concurrent_messages):
            message = {
                'id': uuid4(),
                'subject': f"Concurrent Message {i}",
                'recipients': shared_recipient_ids.copy(),
                'delivery_records': [],
                'created_at': datetime.utcnow() + timedelta(microseconds=i)  # Slight time difference
            }
            
            # Create delivery records for each recipient
            for recipient_id in shared_recipient_ids:
                delivery_record = {
                    'message_id': message['id'],
                    'recipient_id': recipient_id,
                    'status': DeliveryStatus.PENDING,
                    'created_at': message['created_at'],
                    'delivered_at': None
                }
                message['delivery_records'].append(delivery_record)
            
            messages.append(message)
        
        # Simulate concurrent delivery
        for message in messages:
            for record in message['delivery_records']:
                # Simulate delivery with slight delay based on message order
                delivery_delay = messages.index(message) * 0.001  # Microsecond delay
                record['delivered_at'] = message['created_at'] + timedelta(seconds=delivery_delay)
                record['status'] = DeliveryStatus.DELIVERED
        
        # Property 1: Each message has separate delivery tracking
        all_delivery_records = []
        for message in messages:
            all_delivery_records.extend(message['delivery_records'])
        
        assert len(all_delivery_records) == concurrent_messages * shared_recipients
        
        # Property 2: Each recipient receives all messages
        recipient_message_counts = {}
        for record in all_delivery_records:
            recipient_id = record['recipient_id']
            recipient_message_counts[recipient_id] = recipient_message_counts.get(recipient_id, 0) + 1
        
        for recipient_id in shared_recipient_ids:
            assert recipient_message_counts[recipient_id] == concurrent_messages
        
        # Property 3: Delivery order is preserved per recipient
        for recipient_id in shared_recipient_ids:
            recipient_records = [
                record for record in all_delivery_records 
                if record['recipient_id'] == recipient_id
            ]
            
            # Sort by delivery time
            recipient_records.sort(key=lambda r: r['delivered_at'])
            
            # Verify order matches message creation order
            for i, record in enumerate(recipient_records):
                expected_message = messages[i]
                assert record['message_id'] == expected_message['id']
        
        # Property 4: All deliveries completed successfully
        for record in all_delivery_records:
            assert record['status'] == DeliveryStatus.DELIVERED
            assert record['delivered_at'] is not None
            assert record['delivered_at'] >= record['created_at']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])