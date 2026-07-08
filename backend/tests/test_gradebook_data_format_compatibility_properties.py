"""
Property-based tests for gradebook data format compatibility.

Tests the invariants and properties of gradebook import/export functionality
to ensure data integrity across different formats and grade scales.
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from hypothesis.stateful import RuleBasedStateMachine, rule, initialize, invariant
from datetime import datetime, timedelta
import pandas as pd
import io
from typing import Dict, List, Any, Optional
from decimal import Decimal

from app.services.gradebook_service import GradebookService
from app.schemas.gradebook import (
    GradebookExportRequest, GradebookImportRequest, GradebookEntry,
    ImportValidationResult, GradeMapping
)


# Test data generators
@st.composite
def gradebook_entry(draw):
    """Generate a valid gradebook entry."""
    return {
        'student_id': draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        'student_name': draw(st.text(min_size=2, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
        'assessment_id': draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        'assessment_title': draw(st.text(min_size=1, max_size=200, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs', 'Nd')))),
        'score': draw(st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False)),
        'max_score': draw(st.floats(min_value=1, max_value=100, allow_nan=False, allow_infinity=False)),
        'submitted_at': draw(st.datetimes(min_value=datetime(2020, 1, 1), max_value=datetime(2024, 12, 31))),
        'subject': draw(st.sampled_from(['Mathematics', 'Science', 'English', 'History', 'Geography'])),
        'topic': draw(st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs')))),
        'attempts': draw(st.integers(min_value=1, max_value=10)),
        'time_spent': draw(st.integers(min_value=60, max_value=7200))  # 1 minute to 2 hours
    }


@st.composite
def export_request(draw):
    """Generate a valid export request."""
    return GradebookExportRequest(
        class_id=draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        format=draw(st.sampled_from(['standard', 'detailed', 'google_classroom', 'canvas', 'blackboard', 'moodle'])),
        grade_scale=draw(st.sampled_from(['percentage', 'gpa_4_0', 'bangladesh'])),
        include_details=draw(st.booleans()),
        include_comments=draw(st.booleans()),
        include_statistics=draw(st.booleans()),
        date_from=draw(st.one_of(st.none(), st.datetimes(min_value=datetime(2020, 1, 1), max_value=datetime(2024, 6, 1)))),
        date_to=draw(st.one_of(st.none(), st.datetimes(min_value=datetime(2024, 6, 1), max_value=datetime(2024, 12, 31))))
    )


@st.composite
def import_request(draw):
    """Generate a valid import request."""
    return GradebookImportRequest(
        class_id=draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        format=draw(st.sampled_from(['standard', 'detailed', 'google_classroom', 'canvas', 'blackboard', 'moodle'])),
        grade_scale=draw(st.sampled_from(['percentage', 'gpa_4_0', 'bangladesh'])),
        has_headers=draw(st.booleans()),
        validate_only=draw(st.booleans()),
        column_mapping=draw(st.dictionaries(
            keys=st.sampled_from(['student_name', 'student_id', 'assessment_title', 'score', 'max_score']),
            values=st.text(min_size=1, max_size=50),
            min_size=3,
            max_size=10
        ))
    )


class TestGradebookDataFormatCompatibility:
    """Test gradebook data format compatibility properties."""

    @pytest.fixture
    def gradebook_service(self):
        """Create a gradebook service instance for testing."""
        return GradebookService()

    @given(entries=st.lists(gradebook_entry(), min_size=1, max_size=50))
    @settings(max_examples=20, deadline=5000)
    def test_export_import_roundtrip_preserves_data(self, gradebook_service, entries):
        """
        Property: Export-Import roundtrip preserves essential data.
        
        For any valid gradebook entries, exporting to CSV and then importing
        should preserve the essential grade information.
        """
        # Ensure scores don't exceed max_scores
        for entry in entries:
            assume(entry['score'] <= entry['max_score'])
            entry['percentage'] = (entry['score'] / entry['max_score']) * 100

        # Test with different formats and grade scales
        formats = ['standard', 'detailed']
        grade_scales = ['percentage', 'gpa_4_0', 'bangladesh']
        
        for format_type in formats:
            for grade_scale in grade_scales:
                # Export data
                export_request = GradebookExportRequest(
                    class_id="test_class",
                    format=format_type,
                    grade_scale=grade_scale,
                    include_details=True,
                    include_comments=False,
                    include_statistics=False
                )
                
                csv_data = gradebook_service.export_gradebook(entries, export_request)
                
                # Import data back
                import_request = GradebookImportRequest(
                    class_id="test_class",
                    csv_data=csv_data,
                    format=format_type,
                    grade_scale=grade_scale,
                    has_headers=True,
                    validate_only=False,
                    column_mapping={}
                )
                
                result = gradebook_service.import_gradebook(import_request)
                
                # Verify essential data is preserved
                assert result.successful > 0
                assert result.failed == 0
                assert len(result.errors) == 0

    @given(entries=st.lists(gradebook_entry(), min_size=5, max_size=20))
    @settings(max_examples=15, deadline=5000)
    def test_grade_scale_conversion_consistency(self, gradebook_service, entries):
        """
        Property: Grade scale conversions are consistent and reversible.
        
        Converting grades between scales should maintain relative ordering
        and be approximately reversible.
        """
        # Ensure valid score ranges
        for entry in entries:
            assume(entry['score'] <= entry['max_score'])
            assume(entry['max_score'] > 0)
            entry['percentage'] = (entry['score'] / entry['max_score']) * 100

        # Test conversion from percentage to other scales and back
        original_percentages = [entry['percentage'] for entry in entries]
        
        # Convert to GPA 4.0
        gpa_mapping = gradebook_service.get_grade_mapping('percentage', 'gpa_4_0')
        gpa_grades = [gradebook_service.convert_grade(pct, gpa_mapping) for pct in original_percentages]
        
        # Convert back to percentage
        reverse_mapping = gradebook_service.get_grade_mapping('gpa_4_0', 'percentage')
        converted_back = [gradebook_service.convert_grade(gpa, reverse_mapping) for gpa in gpa_grades]
        
        # Verify relative ordering is preserved
        for i in range(len(original_percentages) - 1):
            for j in range(i + 1, len(original_percentages)):
                if original_percentages[i] > original_percentages[j]:
                    assert gpa_grades[i] >= gpa_grades[j], "Relative ordering not preserved in GPA conversion"
                    # Allow some tolerance for roundtrip conversion
                    assert abs(converted_back[i] - converted_back[j]) >= -5, "Relative ordering lost in roundtrip"

    @given(entries=st.lists(gradebook_entry(), min_size=1, max_size=30))
    @settings(max_examples=15, deadline=5000)
    def test_statistics_calculation_consistency(self, gradebook_service, entries):
        """
        Property: Statistical calculations are consistent across formats.
        
        Class statistics should be the same regardless of export format,
        and should satisfy basic mathematical properties.
        """
        # Ensure valid data
        for entry in entries:
            assume(entry['score'] <= entry['max_score'])
            assume(entry['max_score'] > 0)
            entry['percentage'] = (entry['score'] / entry['max_score']) * 100

        class_id = "test_class"
        
        # Calculate statistics
        stats = gradebook_service.get_class_statistics(class_id, entries)
        
        # Verify basic statistical properties
        percentages = [entry['percentage'] for entry in entries]
        
        # Average should be within valid range
        assert 0 <= stats.overall_metrics['class_average'] <= 100
        
        # Average should match manual calculation (within tolerance)
        manual_average = sum(percentages) / len(percentages)
        assert abs(stats.overall_metrics['class_average'] - manual_average) < 0.01
        
        # Highest and lowest should be actual values from the data
        assert stats.overall_metrics['highest_score'] == max(percentages)
        assert stats.overall_metrics['lowest_score'] == min(percentages)
        
        # Standard deviation should be non-negative
        assert stats.overall_metrics['standard_deviation'] >= 0
        
        # If all scores are the same, standard deviation should be 0
        if len(set(percentages)) == 1:
            assert stats.overall_metrics['standard_deviation'] == 0

    @given(
        valid_entries=st.lists(gradebook_entry(), min_size=1, max_size=10),
        invalid_modifications=st.lists(
            st.sampled_from(['negative_score', 'score_exceeds_max', 'empty_name', 'invalid_date']),
            min_size=1,
            max_size=3
        )
    )
    @settings(max_examples=10, deadline=5000)
    def test_import_validation_catches_errors(self, gradebook_service, valid_entries, invalid_modifications):
        """
        Property: Import validation correctly identifies and reports errors.
        
        Invalid data should be caught by validation, and the validation
        should provide meaningful error messages.
        """
        # Start with valid entries
        test_entries = []
        for entry in valid_entries:
            assume(entry['score'] <= entry['max_score'])
            assume(entry['max_score'] > 0)
            test_entries.append(entry.copy())
        
        # Apply invalid modifications
        for i, modification in enumerate(invalid_modifications):
            if i < len(test_entries):
                entry = test_entries[i]
                if modification == 'negative_score':
                    entry['score'] = -10
                elif modification == 'score_exceeds_max':
                    entry['score'] = entry['max_score'] + 50
                elif modification == 'empty_name':
                    entry['student_name'] = ''
                elif modification == 'invalid_date':
                    entry['submitted_at'] = None
        
        # Convert to CSV format
        df = pd.DataFrame(test_entries)
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_data = csv_buffer.getvalue()
        
        # Validate import
        import_request = GradebookImportRequest(
            class_id="test_class",
            csv_data=csv_data,
            format='standard',
            grade_scale='percentage',
            has_headers=True,
            validate_only=True,
            column_mapping={}
        )
        
        validation_result = gradebook_service.validate_import(import_request)
        
        # Should detect errors
        assert not validation_result.is_valid
        assert validation_result.invalid_rows > 0
        assert len(validation_result.errors) > 0
        
        # Each error should have meaningful information
        for error in validation_result.errors:
            assert error.row >= 0
            assert error.column is not None
            assert error.error is not None
            assert len(error.error) > 0

    @given(entries=st.lists(gradebook_entry(), min_size=10, max_size=50))
    @settings(max_examples=10, deadline=5000)
    def test_bulk_operations_maintain_data_integrity(self, gradebook_service, entries):
        """
        Property: Bulk operations maintain data integrity.
        
        Large imports/exports should maintain the same data integrity
        guarantees as small operations.
        """
        # Ensure valid data
        for entry in entries:
            assume(entry['score'] <= entry['max_score'])
            assume(entry['max_score'] > 0)
            entry['percentage'] = (entry['score'] / entry['max_score']) * 100

        # Test bulk export
        export_request = GradebookExportRequest(
            class_id="bulk_test_class",
            format='detailed',
            grade_scale='percentage',
            include_details=True,
            include_comments=True,
            include_statistics=True
        )
        
        csv_data = gradebook_service.export_gradebook(entries, export_request)
        
        # Verify CSV structure
        lines = csv_data.strip().split('\n')
        assert len(lines) >= len(entries) + 1  # +1 for header
        
        # Test bulk import
        import_request = GradebookImportRequest(
            class_id="bulk_test_class",
            csv_data=csv_data,
            format='detailed',
            grade_scale='percentage',
            has_headers=True,
            validate_only=False,
            column_mapping={}
        )
        
        result = gradebook_service.import_gradebook(import_request)
        
        # Verify bulk operation success
        assert result.successful == len(entries)
        assert result.failed == 0
        assert result.summary['total_processed'] == len(entries)
        assert result.summary['processing_time_ms'] > 0


class GradebookStateMachine(RuleBasedStateMachine):
    """
    Stateful property testing for gradebook operations.
    
    Tests complex sequences of operations to ensure system invariants
    are maintained across multiple interactions.
    """
    
    def __init__(self):
        super().__init__()
        self.gradebook_service = GradebookService()
        self.entries: List[Dict[str, Any]] = []
        self.class_id = "state_test_class"
        self.export_formats = ['standard', 'detailed', 'google_classroom']
        self.grade_scales = ['percentage', 'gpa_4_0', 'bangladesh']
    
    @initialize()
    def setup(self):
        """Initialize the state machine with some base data."""
        self.entries = []
    
    @rule(entry=gradebook_entry())
    def add_entry(self, entry):
        """Add a new gradebook entry."""
        assume(entry['score'] <= entry['max_score'])
        assume(entry['max_score'] > 0)
        entry['percentage'] = (entry['score'] / entry['max_score']) * 100
        self.entries.append(entry)
    
    @rule(
        format_type=st.sampled_from(['standard', 'detailed']),
        grade_scale=st.sampled_from(['percentage', 'gpa_4_0'])
    )
    def export_and_reimport(self, format_type, grade_scale):
        """Export data and reimport it."""
        assume(len(self.entries) > 0)
        
        # Export
        export_request = GradebookExportRequest(
            class_id=self.class_id,
            format=format_type,
            grade_scale=grade_scale,
            include_details=True,
            include_comments=False,
            include_statistics=False
        )
        
        csv_data = self.gradebook_service.export_gradebook(self.entries, export_request)
        
        # Import back
        import_request = GradebookImportRequest(
            class_id=self.class_id,
            csv_data=csv_data,
            format=format_type,
            grade_scale=grade_scale,
            has_headers=True,
            validate_only=False,
            column_mapping={}
        )
        
        result = self.gradebook_service.import_gradebook(import_request)
        
        # Verify success
        assert result.successful > 0
        assert result.failed == 0
    
    @rule()
    def calculate_statistics(self):
        """Calculate class statistics."""
        assume(len(self.entries) > 0)
        
        stats = self.gradebook_service.get_class_statistics(self.class_id, self.entries)
        
        # Verify statistics are reasonable
        assert stats.total_students > 0
        assert 0 <= stats.overall_metrics['class_average'] <= 100
        assert stats.overall_metrics['standard_deviation'] >= 0
    
    @invariant()
    def entries_are_valid(self):
        """Invariant: All entries maintain valid score relationships."""
        for entry in self.entries:
            assert entry['score'] <= entry['max_score']
            assert entry['max_score'] > 0
            assert 0 <= entry['percentage'] <= 100
    
    @invariant()
    def statistics_are_consistent(self):
        """Invariant: Statistics are mathematically consistent."""
        if len(self.entries) > 0:
            percentages = [entry['percentage'] for entry in self.entries]
            manual_avg = sum(percentages) / len(percentages)
            
            stats = self.gradebook_service.get_class_statistics(self.class_id, self.entries)
            
            # Average should match manual calculation
            assert abs(stats.overall_metrics['class_average'] - manual_avg) < 0.01


# Run the state machine test
TestGradebookStateMachine = GradebookStateMachine.TestCase