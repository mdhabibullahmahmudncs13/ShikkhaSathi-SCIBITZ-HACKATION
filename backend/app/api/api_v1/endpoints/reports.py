"""
Report Generation API Endpoints

REST API endpoints for generating and exporting various types of reports
including individual student reports, class summaries, and comparative analysis.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import io
import json

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.services.report_service import ReportService, ReportType, ExportFormat

router = APIRouter()


# Request/Response Schemas
class ReportRequest(BaseModel):
    """Base schema for report requests"""
    date_from: Optional[datetime] = Field(None, description="Start date for report period")
    date_to: Optional[datetime] = Field(None, description="End date for report period")
    template_id: Optional[str] = Field(None, description="Report template ID")


class IndividualStudentReportRequest(ReportRequest):
    """Schema for individual student report request"""
    student_id: str = Field(..., description="Student ID for the report")


class ClassSummaryReportRequest(ReportRequest):
    """Schema for class summary report request"""
    class_id: str = Field(..., description="Class ID for the report")


class ComparativeAnalysisReportRequest(ReportRequest):
    """Schema for comparative analysis report request"""
    class_ids: List[str] = Field(..., min_items=2, description="List of class IDs to compare")


class ReportExportRequest(BaseModel):
    """Schema for report export request"""
    report_data: Dict[str, Any] = Field(..., description="Report data to export")
    format: ExportFormat = Field(..., description="Export format")
    filename: Optional[str] = Field(None, description="Custom filename")


class ReportResponse(BaseModel):
    """Schema for report response"""
    report_id: str
    report_type: ReportType
    report_data: Dict[str, Any]
    generated_at: datetime
    generation_time_ms: int


class ReportTemplateResponse(BaseModel):
    """Schema for report template response"""
    id: str
    name: str
    description: str
    type: ReportType
    sections: List[str]


@router.get("/templates", response_model=List[ReportTemplateResponse])
async def get_report_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get available report templates
    
    Returns list of available report templates with their configurations
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access report templates"
        )
    
    service = ReportService(db)
    templates = await service.get_available_report_templates()
    
    return [ReportTemplateResponse(**template) for template in templates]


@router.post("/individual-student", response_model=ReportResponse)
async def generate_individual_student_report(
    report_request: IndividualStudentReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate individual student report
    
    - **student_id**: ID of the student for the report
    - **date_from**: Start date for report period (optional)
    - **date_to**: End date for report period (optional)
    - **template_id**: Report template to use (optional)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can generate student reports"
        )
    
    service = ReportService(db)
    start_time = datetime.utcnow()
    
    try:
        report_data = await service.generate_individual_student_report(
            teacher_id=current_user.id,
            student_id=report_request.student_id,
            date_from=report_request.date_from,
            date_to=report_request.date_to
        )
        
        generation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        return ReportResponse(
            report_id=f"student_{report_request.student_id}_{int(start_time.timestamp())}",
            report_type=ReportType.INDIVIDUAL_STUDENT,
            report_data=report_data,
            generated_at=start_time,
            generation_time_ms=int(generation_time)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Report generation failed")


@router.post("/class-summary", response_model=ReportResponse)
async def generate_class_summary_report(
    report_request: ClassSummaryReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate class summary report
    
    - **class_id**: ID of the class for the report
    - **date_from**: Start date for report period (optional)
    - **date_to**: End date for report period (optional)
    - **template_id**: Report template to use (optional)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can generate class reports"
        )
    
    service = ReportService(db)
    start_time = datetime.utcnow()
    
    try:
        report_data = await service.generate_class_summary_report(
            teacher_id=current_user.id,
            class_id=report_request.class_id,
            date_from=report_request.date_from,
            date_to=report_request.date_to
        )
        
        generation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        return ReportResponse(
            report_id=f"class_{report_request.class_id}_{int(start_time.timestamp())}",
            report_type=ReportType.CLASS_SUMMARY,
            report_data=report_data,
            generated_at=start_time,
            generation_time_ms=int(generation_time)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Report generation failed")


@router.post("/comparative-analysis", response_model=ReportResponse)
async def generate_comparative_analysis_report(
    report_request: ComparativeAnalysisReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate comparative analysis report
    
    - **class_ids**: List of class IDs to compare (minimum 2)
    - **date_from**: Start date for report period (optional)
    - **date_to**: End date for report period (optional)
    - **template_id**: Report template to use (optional)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can generate comparative reports"
        )
    
    service = ReportService(db)
    start_time = datetime.utcnow()
    
    try:
        report_data = await service.generate_comparative_analysis_report(
            teacher_id=current_user.id,
            class_ids=report_request.class_ids,
            date_from=report_request.date_from,
            date_to=report_request.date_to
        )
        
        generation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        return ReportResponse(
            report_id=f"comparative_{hash(tuple(report_request.class_ids))}_{int(start_time.timestamp())}",
            report_type=ReportType.COMPARATIVE_ANALYSIS,
            report_data=report_data,
            generated_at=start_time,
            generation_time_ms=int(generation_time)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Report generation failed")


@router.post("/export/csv")
async def export_report_csv(
    export_request: ReportExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export report data as CSV
    
    - **report_data**: Report data to export
    - **filename**: Custom filename (optional)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can export reports"
        )
    
    try:
        # Generate CSV content
        csv_content = await _generate_csv_export(export_request.report_data)
        
        # Create filename
        filename = export_request.filename or f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        if not filename.endswith('.csv'):
            filename += '.csv'
        
        # Return as streaming response
        return StreamingResponse(
            io.StringIO(csv_content),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Export failed")


@router.post("/export/json")
async def export_report_json(
    export_request: ReportExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export report data as JSON
    
    - **report_data**: Report data to export
    - **filename**: Custom filename (optional)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can export reports"
        )
    
    try:
        # Create filename
        filename = export_request.filename or f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        if not filename.endswith('.json'):
            filename += '.json'
        
        # Convert datetime objects to strings for JSON serialization
        json_data = _serialize_report_data(export_request.report_data)
        json_content = json.dumps(json_data, indent=2, ensure_ascii=False)
        
        # Return as streaming response
        return StreamingResponse(
            io.StringIO(json_content),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Export failed")


@router.post("/export/pdf")
async def export_report_pdf(
    export_request: ReportExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export report data as PDF
    
    - **report_data**: Report data to export
    - **filename**: Custom filename (optional)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can export reports"
        )
    
    try:
        from app.services.export_service import ExportService
        
        export_service = ExportService()
        export_result = await export_service.export_report(
            report_data=export_request.report_data,
            export_format=ExportFormat.PDF,
            filename=export_request.filename
        )
        
        # Return file
        from fastapi.responses import FileResponse
        return FileResponse(
            path=export_result['file_path'],
            filename=export_result['filename'],
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={export_result['filename']}"}
        )
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="PDF export failed")


@router.post("/export/excel")
async def export_report_excel(
    export_request: ReportExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export report data as Excel
    
    - **report_data**: Report data to export
    - **filename**: Custom filename (optional)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can export reports"
        )
    
    try:
        from app.services.export_service import ExportService
        
        export_service = ExportService()
        export_result = await export_service.export_report(
            report_data=export_request.report_data,
            export_format=ExportFormat.EXCEL,
            filename=export_request.filename
        )
        
        # Return file
        from fastapi.responses import FileResponse
        return FileResponse(
            path=export_result['file_path'],
            filename=export_result['filename'],
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={export_result['filename']}"}
        )
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Excel export failed")


@router.post("/email")
async def email_report(
    export_result: Dict[str, Any],
    recipient_email: str,
    subject: Optional[str] = None,
    message: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send exported report via email
    
    - **export_result**: Result from export endpoint
    - **recipient_email**: Email address to send to
    - **subject**: Email subject (optional)
    - **message**: Email message body (optional)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can email reports"
        )
    
    try:
        from app.services.export_service import ExportService
        
        export_service = ExportService()
        
        # Add email sending to background tasks
        background_tasks.add_task(
            export_service.send_report_email,
            export_result=export_result,
            recipient_email=recipient_email,
            subject=subject,
            message=message,
            sender_name=current_user.full_name
        )
        
        return {
            "success": True,
            "message": "Email queued for delivery",
            "recipient": recipient_email
        }
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Email queuing failed")


@router.get("/formats", response_model=List[Dict[str, str]])
async def get_export_formats():
    """
    Get available export formats
    
    Returns list of supported export formats with descriptions
    """
    return [
        {
            "format": ExportFormat.CSV,
            "name": "CSV (Comma Separated Values)",
            "description": "Spreadsheet-compatible format for data analysis",
            "mime_type": "text/csv"
        },
        {
            "format": ExportFormat.JSON,
            "name": "JSON (JavaScript Object Notation)",
            "description": "Structured data format for programmatic access",
            "mime_type": "application/json"
        },
        {
            "format": ExportFormat.PDF,
            "name": "PDF (Portable Document Format)",
            "description": "Formatted document for sharing and printing",
            "mime_type": "application/pdf"
        },
        {
            "format": ExportFormat.EXCEL,
            "name": "Excel (Microsoft Excel)",
            "description": "Excel workbook with formatted data and charts",
            "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
    ]


# Helper functions
async def _generate_csv_export(report_data: Dict[str, Any]) -> str:
    """Generate CSV content from report data"""
    import csv
    from io import StringIO
    
    output = StringIO()
    writer = csv.writer(output)
    
    # Write report header
    writer.writerow(['Report Type', report_data.get('report_type', 'Unknown')])
    writer.writerow(['Generated At', report_data.get('generated_at', datetime.utcnow())])
    writer.writerow([])  # Empty row
    
    # Write different sections based on report type
    if report_data.get('report_type') == ReportType.INDIVIDUAL_STUDENT:
        _write_individual_student_csv(writer, report_data)
    elif report_data.get('report_type') == ReportType.CLASS_SUMMARY:
        _write_class_summary_csv(writer, report_data)
    elif report_data.get('report_type') == ReportType.COMPARATIVE_ANALYSIS:
        _write_comparative_analysis_csv(writer, report_data)
    
    return output.getvalue()


def _write_individual_student_csv(writer, report_data: Dict[str, Any]):
    """Write individual student report data to CSV"""
    # Student info
    student_info = report_data.get('student_info', {})
    writer.writerow(['Student Information'])
    writer.writerow(['Name', student_info.get('name', '')])
    writer.writerow(['Email', student_info.get('email', '')])
    writer.writerow([])
    
    # Overview metrics
    metrics = report_data.get('overview_metrics', {})
    writer.writerow(['Overview Metrics'])
    for key, value in metrics.items():
        writer.writerow([key.replace('_', ' ').title(), value])
    writer.writerow([])
    
    # Subject performance
    subject_perf = report_data.get('subject_performance', {})
    if subject_perf:
        writer.writerow(['Subject Performance'])
        writer.writerow(['Subject', 'Average Score', 'Time Spent', 'Topics Completed', 'XP Earned'])
        for subject, data in subject_perf.items():
            writer.writerow([
                subject,
                data.get('average_score', 0),
                data.get('time_spent', 0),
                data.get('topics_completed', 0),
                data.get('xp_earned', 0)
            ])


def _write_class_summary_csv(writer, report_data: Dict[str, Any]):
    """Write class summary report data to CSV"""
    # Class info
    class_info = report_data.get('class_info', {})
    writer.writerow(['Class Information'])
    writer.writerow(['Name', class_info.get('name', '')])
    writer.writerow(['Grade', class_info.get('grade', '')])
    writer.writerow(['Subject', class_info.get('subject', '')])
    writer.writerow([])
    
    # Overview metrics
    metrics = report_data.get('overview_metrics', {})
    writer.writerow(['Class Metrics'])
    for key, value in metrics.items():
        writer.writerow([key.replace('_', ' ').title(), value])
    writer.writerow([])
    
    # Top performers
    top_performers = report_data.get('top_performers', [])
    if top_performers:
        writer.writerow(['Top Performers'])
        writer.writerow(['Student Name', 'Average Score'])
        for performer in top_performers:
            writer.writerow([performer.get('student_name', ''), performer.get('average_score', 0)])


def _write_comparative_analysis_csv(writer, report_data: Dict[str, Any]):
    """Write comparative analysis report data to CSV"""
    # Comparison metrics
    metrics = report_data.get('comparison_metrics', {})
    writer.writerow(['Comparison Metrics'])
    for key, value in metrics.items():
        writer.writerow([key.replace('_', ' ').title(), value])
    writer.writerow([])
    
    # Class comparisons
    comparisons = report_data.get('class_comparisons', [])
    if comparisons:
        writer.writerow(['Class Comparisons'])
        writer.writerow(['Class Name', 'Student Count', 'Engagement Rate', 'Class Average', 'At Risk Count'])
        for comp in comparisons:
            writer.writerow([
                comp.get('class_name', ''),
                comp.get('student_count', 0),
                comp.get('engagement_rate', 0),
                comp.get('class_average', 0),
                comp.get('at_risk_count', 0)
            ])


def _serialize_report_data(data: Any) -> Any:
    """Serialize report data for JSON export"""
    if isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, dict):
        return {key: _serialize_report_data(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [_serialize_report_data(item) for item in data]
    else:
        return data