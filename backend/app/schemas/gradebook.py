"""
Pydantic schemas for gradebook integration API.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class ExternalGradebookFormat(str, Enum):
    """Supported external gradebook formats."""
    standard = "standard"
    detailed = "detailed"
    google_classroom = "google_classroom"
    canvas = "canvas"
    blackboard = "blackboard"
    moodle = "moodle"


class GradeScale(str, Enum):
    """Supported grade scales."""
    percentage = "percentage"
    four_point = "4_point"
    bangladesh = "bangladesh"
    custom = "custom"


class GradebookEntry(BaseModel):
    """Individual gradebook entry."""
    student_id: str
    student_name: str
    assignment_name: str
    score: float
    max_score: float
    percentage: float
    letter_grade: Optional[str] = None
    date_recorded: datetime
    subject: Optional[str] = None
    notes: Optional[str] = None


class GradebookExportRequest(BaseModel):
    """Request for exporting gradebook data."""
    format: ExternalGradebookFormat = ExternalGradebookFormat.standard
    grade_scale: Optional[GradeScale] = GradeScale.percentage
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    student_ids: Optional[List[str]] = None
    include_assignments: bool = True
    include_quizzes: bool = True
    include_assessments: bool = True


class GradebookImportRequest(BaseModel):
    """Request for importing gradebook data."""
    format: ExternalGradebookFormat = ExternalGradebookFormat.standard
    data: List[Dict[str, Any]]
    validate_only: bool = False
    overwrite_existing: bool = False
    class_id: Optional[str] = None


class ImportValidationResult(BaseModel):
    """Result of import validation."""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    valid_entries: int = 0
    invalid_entries: int = 0
    details: Optional[Dict[str, Any]] = None


class GradeMapping(BaseModel):
    """Grade mapping configuration."""
    letter_grade: str
    min_percentage: float
    max_percentage: float
    gpa_value: Optional[float] = None
    description: Optional[str] = None


class GradebookImportResult(BaseModel):
    """Result of gradebook import operation."""
    successful: int
    failed: int
    warnings: Optional[List[str]] = None
    errors: Optional[List[Dict[str, Any]]] = None
    import_summary: Optional[Dict[str, Any]] = None


class GradeScaleMapping(BaseModel):
    """Grade scale mapping configuration."""
    scale_name: str
    scale_type: GradeScale
    mappings: Dict[str, Dict[str, float]]  # letter -> {min, max}
    description: Optional[str] = None
    is_default: bool = False


class GradeSyncResult(BaseModel):
    """Result of grade synchronization with external system."""
    synced_students: int
    failed_syncs: int
    last_sync: datetime
    external_system: str
    sync_status: str
    errors: Optional[List[str]] = None
    warnings: Optional[List[str]] = None


class ExternalSystemConfig(BaseModel):
    """Configuration for external gradebook system."""
    system_name: str
    api_endpoint: Optional[str] = None
    authentication: Dict[str, Any]
    field_mappings: Dict[str, str]
    sync_frequency: Optional[str] = None
    enabled: bool = True


class GradeImportMapping(BaseModel):
    """Mapping configuration for grade import."""
    csv_column: str
    target_field: str
    data_type: str = "float"
    required: bool = True
    default_value: Optional[Any] = None
    validation_rules: Optional[Dict[str, Any]] = None


class GradebookTemplate(BaseModel):
    """Template for gradebook export/import."""
    name: str
    description: str
    format: ExternalGradebookFormat
    columns: List[str]
    required_columns: List[str]
    optional_columns: List[str]
    sample_data: Optional[Dict[str, Any]] = None


class ClassGradeStatistics(BaseModel):
    """Grade statistics for a class."""
    class_id: str
    total_students: int
    total_assignments: int
    average_score: float
    median_score: float
    min_score: float
    max_score: float
    grade_distribution: Dict[str, int]
    performance_trends: Optional[List[Dict[str, Any]]] = None


class StudentGradeSummary(BaseModel):
    """Grade summary for individual student."""
    student_id: str
    student_name: str
    overall_average: float
    letter_grade: str
    total_assignments: int
    assignments_completed: int
    completion_rate: float
    recent_performance: List[Dict[str, Any]]
    subject_averages: Dict[str, float]


class GradebookSyncConfig(BaseModel):
    """Configuration for gradebook synchronization."""
    class_id: str
    external_system: str
    sync_direction: str = "export"  # export, import, bidirectional
    auto_sync: bool = False
    sync_frequency: Optional[str] = None
    field_mappings: Dict[str, str]
    filters: Optional[Dict[str, Any]] = None


class GradeMappingSuggestion(BaseModel):
    """Suggested grade mapping based on class performance."""
    suggested_scale: GradeScale
    confidence_score: float
    reasoning: List[str]
    alternative_scales: List[GradeScale]
    adjustments: Optional[Dict[str, Any]] = None


class GradebookAuditLog(BaseModel):
    """Audit log entry for gradebook operations."""
    operation_id: str
    operation_type: str
    teacher_id: str
    class_id: str
    timestamp: datetime
    details: Dict[str, Any]
    affected_students: List[str]
    success: bool
    error_message: Optional[str] = None


class GradebookBackup(BaseModel):
    """Gradebook backup data."""
    backup_id: str
    class_id: str
    created_at: datetime
    created_by: str
    data_snapshot: Dict[str, Any]
    metadata: Dict[str, Any]
    restore_point: bool = False


class GradeCalculationRule(BaseModel):
    """Rule for calculating grades."""
    rule_id: str
    name: str
    description: str
    calculation_type: str  # weighted_average, points_based, etc.
    weights: Dict[str, float]
    drop_lowest: Optional[int] = None
    extra_credit: bool = False
    rounding_rule: str = "round_half_up"


class GradebookPermissions(BaseModel):
    """Permissions for gradebook access."""
    teacher_id: str
    class_id: str
    can_view_grades: bool = True
    can_edit_grades: bool = True
    can_export_grades: bool = True
    can_import_grades: bool = True
    can_sync_external: bool = False
    restricted_students: Optional[List[str]] = None


class GradebookNotification(BaseModel):
    """Notification for gradebook events."""
    notification_id: str
    type: str  # grade_posted, import_complete, sync_failed, etc.
    title: str
    message: str
    class_id: str
    teacher_id: str
    created_at: datetime
    read: bool = False
    action_required: bool = False
    metadata: Optional[Dict[str, Any]] = None