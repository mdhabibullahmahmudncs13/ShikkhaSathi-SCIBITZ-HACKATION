# Teacher Dashboard Design Document

## Overview

The Teacher Dashboard is a comprehensive web-based interface that provides educators with powerful tools to monitor student progress, create assessments, analyze learning patterns, and manage their classroom effectively. Built on top of ShikkhaSathi's existing infrastructure, it leverages real-time student data, gamification metrics, and AI-powered insights to enhance teaching effectiveness.

The dashboard follows a modern, responsive design pattern with role-based access control, ensuring teachers can access relevant student information while maintaining privacy and security standards. It integrates seamlessly with the existing student experience, creating a unified educational ecosystem.

## Architecture

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Teacher UI    │    │   Student UI    │    │   Parent UI     │
│   (React)       │    │   (React)       │    │   (Future)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   (FastAPI)     │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Teacher        │    │  Analytics      │    │  Assessment     │
│  Service        │    │  Service        │    │  Service        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Data Layer    │
                    │ PostgreSQL +    │
                    │ MongoDB + Redis │
                    └─────────────────┘
```

### Component Architecture
```
Teacher Dashboard
├── Navigation Header
├── Sidebar Menu
│   ├── Dashboard Overview
│   ├── Student Roster
│   ├── Analytics
│   ├── Assessments
│   ├── Learning Paths
│   ├── Communications
│   └── Settings
└── Main Content Area
    ├── Dashboard Widgets
    ├── Data Visualization
    ├── Student Detail Views
    ├── Assessment Builder
    └── Report Generator
```

## Components and Interfaces

### Frontend Components

#### 1. TeacherDashboard (Main Container)
```typescript
interface TeacherDashboardProps {
  teacher: Teacher;
  selectedClass?: ClassInfo;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  classes: ClassInfo[];
  permissions: TeacherPermission[];
}
```

#### 2. StudentRoster Component
```typescript
interface StudentRosterProps {
  classId: string;
  students: StudentSummary[];
  onStudentSelect: (studentId: string) => void;
  sortBy: 'name' | 'progress' | 'lastActive';
  filterBy: RosterFilter;
}

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  totalXP: number;
  currentLevel: number;
  currentStreak: number;
  lastActive: Date;
  overallProgress: number;
  atRisk: boolean;
  subjectProgress: SubjectProgress[];
}
```

#### 3. ClassAnalytics Component
```typescript
interface ClassAnalyticsProps {
  classId: string;
  timeRange: '7d' | '30d' | '90d';
  metrics: ClassMetrics;
}

interface ClassMetrics {
  averageScore: number;
  completionRate: number;
  activeStudents: number;
  totalStudents: number;
  subjectPerformance: SubjectMetrics[];
  trendData: TrendPoint[];
  weakAreas: WeakArea[];
}
```

#### 4. AssessmentBuilder Component
```typescript
interface AssessmentBuilderProps {
  onSave: (assessment: Assessment) => void;
  existingAssessment?: Assessment;
  availableQuestions: Question[];
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: number;
  questions: AssessmentQuestion[];
  rubric: Rubric;
  settings: AssessmentSettings;
}
```

### Backend API Interfaces

#### 1. Teacher Analytics API
```python
@router.get("/teacher/class-overview")
async def get_class_overview(
    class_id: Optional[str] = None,
    current_teacher: Teacher = Depends(get_current_teacher)
) -> ClassOverview

@router.get("/teacher/student/{student_id}/analytics")
async def get_student_analytics(
    student_id: str,
    time_range: str = "30d",
    current_teacher: Teacher = Depends(get_current_teacher)
) -> StudentAnalytics
```

#### 2. Assessment Management API
```python
@router.post("/assessment/create")
async def create_assessment(
    assessment: AssessmentCreate,
    current_teacher: Teacher = Depends(get_current_teacher)
) -> Assessment

@router.get("/assessment/{assessment_id}/results")
async def get_assessment_results(
    assessment_id: str,
    current_teacher: Teacher = Depends(get_current_teacher)
) -> AssessmentResults
```

## Data Models

### Teacher Model
```python
class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    employee_id = Column(String, unique=True)
    subjects = Column(JSON)  # List of subjects taught
    grade_levels = Column(JSON)  # List of grades taught
    classes = relationship("TeacherClass", back_populates="teacher")
    assessments = relationship("Assessment", back_populates="teacher")
```

### TeacherClass Model
```python
class TeacherClass(Base):
    __tablename__ = "teacher_classes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"))
    class_name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    grade_level = Column(Integer, nullable=False)
    students = relationship("StudentClass", back_populates="teacher_class")
```

### Assessment Model
```python
class Assessment(Base):
    __tablename__ = "assessments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    subject = Column(String, nullable=False)
    grade_level = Column(Integer, nullable=False)
    questions = Column(JSON)  # List of question IDs and settings
    rubric = Column(JSON)  # Scoring rubric
    settings = Column(JSON)  # Time limits, attempts, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Student Roster Completeness
*For any* teacher's class, when viewing the student roster, all assigned students should appear in the list with current progress data
**Validates: Requirements 1.1**

### Property 2: Real-time Data Consistency
*For any* student progress update, the teacher dashboard should reflect the changes within 30 seconds across all relevant views
**Validates: Requirements 1.4**

### Property 3: Assessment Question Validation
*For any* assessment creation, all questions must have valid correct answers and proper scoring criteria before the assessment can be published
**Validates: Requirements 2.3**

### Property 4: Analytics Data Accuracy
*For any* class analytics calculation, the aggregate metrics should equal the sum of individual student metrics for the same time period
**Validates: Requirements 3.1**

### Property 5: Learning Path Assignment Consistency
*For any* learning path assignment, the recommended quizzes should appear in the student's dashboard and progress should be tracked correctly
**Validates: Requirements 4.3, 4.4**

### Property 6: Communication Delivery Guarantee
*For any* message sent to students or parents, the system should confirm delivery and provide read receipts where applicable
**Validates: Requirements 5.1, 5.2**

### Property 7: Access Control Enforcement
*For any* teacher accessing student data, they should only see information for students in their assigned classes
**Validates: Requirements 6.1, 6.2**

### Property 8: Report Data Integrity
*For any* exported report, the data should match exactly what is displayed in the dashboard for the same time period and filters
**Validates: Requirements 7.1, 7.3**

### Property 9: At-Risk Student Detection
*For any* student inactive for 7+ days or scoring below 60% average, they should be automatically flagged as "at risk" in the teacher dashboard
**Validates: Requirements 1.5, 3.3**

### Property 10: Assessment Availability Control
*For any* published assessment, it should only be accessible to students during the defined availability window set by the teacher
**Validates: Requirements 6.3**

## Error Handling

### Client-Side Error Handling
- **Network Failures**: Retry mechanism with exponential backoff
- **Authentication Errors**: Automatic token refresh and re-authentication
- **Data Loading Errors**: Graceful fallbacks with cached data when available
- **Form Validation**: Real-time validation with clear error messages
- **Permission Errors**: Clear messaging about access restrictions

### Server-Side Error Handling
- **Database Errors**: Transaction rollback and error logging
- **Authorization Failures**: Detailed audit logging for security monitoring
- **Data Validation Errors**: Comprehensive input validation with specific error messages
- **External Service Failures**: Circuit breaker pattern for third-party integrations
- **Rate Limiting**: Graceful degradation with informative responses

### Error Recovery Strategies
- **Optimistic Updates**: UI updates immediately with server confirmation
- **Offline Capability**: Cache critical data for offline viewing
- **Progressive Enhancement**: Core functionality works even if advanced features fail
- **User Feedback**: Clear error messages with suggested actions

## Testing Strategy

### Unit Testing Approach
Unit tests will focus on:
- Individual component rendering and interaction
- Data transformation and calculation functions
- API endpoint validation and response handling
- Permission and access control logic
- Form validation and submission workflows

### Property-Based Testing Requirements
The system will use **pytest with hypothesis** for property-based testing with a minimum of 100 iterations per test. Each property-based test will be tagged with comments referencing the design document properties.

**Property Test Examples:**

```python
# Feature: teacher-dashboard, Property 1: Student Roster Completeness
@given(teacher_class=teacher_class_strategy(), students=student_list_strategy())
def test_roster_completeness_property(teacher_class, students):
    """Test that all assigned students appear in roster with progress data"""
    roster = get_student_roster(teacher_class.id)
    assert len(roster.students) == len(students)
    for student in roster.students:
        assert student.progress_data is not None
        assert student.id in [s.id for s in students]

# Feature: teacher-dashboard, Property 3: Assessment Question Validation  
@given(assessment=assessment_strategy())
def test_assessment_validation_property(assessment):
    """Test that assessments cannot be published without valid questions"""
    if any(q.correct_answer is None for q in assessment.questions):
        with pytest.raises(ValidationError):
            publish_assessment(assessment)
    else:
        result = publish_assessment(assessment)
        assert result.published_at is not None
```

### Integration Testing
- **API Integration**: Test complete workflows from frontend to database
- **Authentication Flow**: Verify teacher login and permission enforcement
- **Real-time Updates**: Test WebSocket connections and data synchronization
- **Report Generation**: Validate export functionality and data accuracy
- **Cross-browser Compatibility**: Ensure consistent behavior across browsers

### Performance Testing
- **Dashboard Load Times**: < 2 seconds for initial load
- **Student Roster**: Handle 100+ students without performance degradation
- **Analytics Queries**: Complex aggregations complete within 5 seconds
- **Report Generation**: Large exports complete within 30 seconds
- **Concurrent Users**: Support 50+ teachers simultaneously

The testing strategy ensures both functional correctness through unit tests and universal properties through property-based testing, providing comprehensive coverage of the teacher dashboard functionality.