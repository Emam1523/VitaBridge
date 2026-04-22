from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.enums import MetricCode
from app.schemas.common import (
    DriveIngestionItem,
    DriveIngestionResponse,
    ManualMeasurementCreate,
    ManualMeasurementResponse,
    MeasurementTableResponse,
    MeasurementUpdateRequest,
    MeasurementTableItem,
    PatientTrendResponse,
    ReportUploadResponse,
    SymptomCheckRequest,
    SymptomCheckResponse,
)
from app.services.ingestion_service import IngestionService
from app.services.symptom_service import SymptomService
from app.services.trend_service import TrendService

router = APIRouter(tags=["analytics"])


@router.post("/symptom-check", response_model=SymptomCheckResponse)
def symptom_check(payload: SymptomCheckRequest) -> SymptomCheckResponse:
    service = SymptomService()
    result = service.check(payload.symptoms)
    return SymptomCheckResponse(
        patient_id=payload.patient_id,
        symptoms=payload.symptoms,
        urgency=result["urgency"],
        probable_diseases=result["probable_diseases"],
        suggested_specialties=result["suggested_specialties"],
        matched_keywords=result["matched_keywords"],
        advice=result["advice"],
    )


def _to_drive_items(results: list[ReportUploadResponse]) -> list[DriveIngestionItem]:
    return [
        DriveIngestionItem(
            report_id=item.report_id,
            status=item.status,
            extracted_count=item.extracted_count,
            needs_review=item.needs_review,
        )
        for item in results
    ]


@router.post(
    "/patients/{patient_id}/reports/upload", response_model=ReportUploadResponse
)
async def upload_report(
    patient_id: str,
    file: UploadFile = File(...),
    reported_at: datetime | None = Form(default=None),
    db: Session = Depends(get_db),
) -> ReportUploadResponse:
    service = IngestionService(db)
    return await service.ingest_report(
        patient_id=patient_id, file=file, reported_at=reported_at
    )


@router.post(
    "/patients/{patient_id}/reports/ingest-drive",
    response_model=DriveIngestionResponse,
)
def ingest_reports_from_drive(
    patient_id: str,
    folder_path: str | None = Query(default=None),
    reported_at: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
) -> DriveIngestionResponse:
    service = IngestionService(db)
    results = service.ingest_reports_from_drive(
        patient_id=patient_id,
        folder_path=folder_path,
        reported_at=reported_at,
    )
    return DriveIngestionResponse(
        patient_id=patient_id,
        ingested_count=len(results),
        items=_to_drive_items(results),
    )


@router.get("/patients/{patient_id}/trends", response_model=PatientTrendResponse)
def get_patient_trends(
    patient_id: str,
    metric: MetricCode | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
) -> PatientTrendResponse:
    service = TrendService(db)
    return service.get_trends(
        patient_id=patient_id,
        metric=metric,
        from_date=from_date,
        to_date=to_date,
    )


@router.post(
    "/patients/{patient_id}/measurements/manual",
    response_model=ManualMeasurementResponse,
)
def add_manual_measurement(
    patient_id: str,
    payload: ManualMeasurementCreate,
    db: Session = Depends(get_db),
) -> ManualMeasurementResponse:
    service = TrendService(db)
    return service.add_manual_measurement(patient_id=patient_id, payload=payload)


@router.get(
    "/patients/{patient_id}/measurements", response_model=MeasurementTableResponse
)
def list_patient_measurements(
    patient_id: str,
    db: Session = Depends(get_db),
) -> MeasurementTableResponse:
    service = TrendService(db)
    return service.list_measurements(patient_id=patient_id)


@router.delete("/patients/{patient_id}/measurements/{measurement_id}")
def delete_patient_measurement(
    patient_id: str,
    measurement_id: int,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    service = TrendService(db)
    service.delete_measurement(patient_id=patient_id, measurement_id=measurement_id)
    return {"status": "deleted"}


@router.put(
    "/patients/{patient_id}/measurements/{measurement_id}",
    response_model=MeasurementTableItem,
)
def update_patient_measurement(
    patient_id: str,
    measurement_id: int,
    payload: MeasurementUpdateRequest,
    db: Session = Depends(get_db),
) -> MeasurementTableItem:
    service = TrendService(db)
    return service.update_measurement(
        patient_id=patient_id,
        measurement_id=measurement_id,
        payload=payload,
    )
