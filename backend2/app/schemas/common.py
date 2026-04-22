from datetime import datetime

from pydantic import BaseModel

from app.models.enums import MetricCode


class MeasurementOut(BaseModel):
    metric_code: MetricCode
    value: float
    unit: str
    measured_at: datetime
    confidence: float | None = None


class ManualMeasurementCreate(BaseModel):
    metric_code: MetricCode
    value: float
    measured_at: datetime | None = None
    unit: str | None = None


class ManualMeasurementResponse(BaseModel):
    measurement_id: int
    patient_id: str
    metric_code: MetricCode
    value: float
    unit: str
    measured_at: datetime


class ReportUploadResponse(BaseModel):
    report_id: int
    status: str
    extracted_count: int
    needs_review: bool
    parsed_items: list["ReportParsedItem"] | None = None


class DriveIngestionItem(BaseModel):
    report_id: int
    status: str
    extracted_count: int
    needs_review: bool


class DriveIngestionResponse(BaseModel):
    patient_id: str
    ingested_count: int
    items: list[DriveIngestionItem]


class TrendPoint(BaseModel):
    measured_at: datetime
    value: float
    unit: str


class MetricTrend(BaseModel):
    metric_code: MetricCode
    unit: str
    points: list[TrendPoint]


class PatientTrendResponse(BaseModel):
    patient_id: str
    trends: list[MetricTrend]


class DocumentMetadata(BaseModel):
    objectName: str
    fileName: str
    mimeType: str | None = None
    issuedAt: datetime | None = None
    uploadedAt: datetime | None = None


class MeasurementTableItem(BaseModel):
    measurement_id: int
    patient_id: str
    report_id: int | None
    metric_code: MetricCode
    value: float
    unit: str
    measured_at: datetime
    confidence: float | None = None


class ReportParsedItem(BaseModel):
    metric_code: MetricCode
    value: float
    unit: str
    measured_at: datetime
    confidence: float | None = None
    normal_low: float | None = None
    normal_high: float | None = None
    status: str | None = None


class MeasurementTableResponse(BaseModel):
    patient_id: str
    items: list[MeasurementTableItem]


class MeasurementUpdateRequest(BaseModel):
    metric_code: MetricCode | None = None
    value: float | None = None
    unit: str | None = None
    measured_at: datetime | None = None
    confidence: float | None = None


class SymptomCheckRequest(BaseModel):
    patient_id: str | None = None
    symptoms: str


class SymptomCheckResponse(BaseModel):
    patient_id: str | None = None
    symptoms: str
    urgency: str
    probable_diseases: list[str]
    suggested_specialties: list[str]
    matched_keywords: list[str]
    advice: str
