import re
from dataclasses import dataclass
from datetime import UTC, datetime

from app.models.enums import MetricCode


@dataclass
class ParsedMeasurement:
    metric_code: MetricCode
    value: float
    unit: str
    measured_at: datetime
    confidence: float
    normal_low: float | None = None
    normal_high: float | None = None


class ParserService:
    _PATTERNS: dict[MetricCode, tuple[re.Pattern[str], str]] = {
        MetricCode.total_cholesterol: (
            re.compile(
                r"(?:total\s+chol(?:esterol)?|cholesterol\s*total|total\s*cholestrol)\s*[:=\-]?\s*(\d+(?:[\.,]\d+)?)",
                re.I,
            ),
            "mg/dL",
        ),
        MetricCode.ldl: (
            re.compile(r"\bld[1il]\b(?:\s*[- ]?c)?(?:\s*cholesterol)?\s*[:=\-]?\s*(\d+(?:[\.,]\d+)?)", re.I),
            "mg/dL",
        ),
        MetricCode.hdl: (
            re.compile(r"\bhd[1il]\b(?:\s*[- ]?c)?(?:\s*cholesterol)?\s*[:=\-]?\s*(\d+(?:[\.,]\d+)?)", re.I),
            "mg/dL",
        ),
        MetricCode.triglycerides: (
            re.compile(r"\btri\s*glycerides?\b\s*[:=\-]?\s*(\d+(?:[\.,]\d+)?)", re.I),
            "mg/dL",
        ),
        MetricCode.heart_rate: (
            re.compile(r"(?:heart\s*rate|pulse(?:\s*rate)?|hr\b)\s*[:=\-]?\s*(\d+(?:[\.,]\d+)?)", re.I),
            "bpm",
        ),
        MetricCode.oxygen_saturation: (
            re.compile(
                r"(?:oxygen\s*saturation|sp\s*o\s*2|spo2|o2\s*sat|sao2)\s*[:=\-]?\s*(\d+(?:[\.,]\d+)?)", re.I
            ),
            "%",
        ),
    }

    _BP_PATTERN = re.compile(
        r"(?:blood\s*pressure|bp)\s*[:\-]?\s*(\d{2,3})\s*/\s*(\d{2,3})",
        re.I,
    )
    _DATE_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b"),
        re.compile(r"\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b"),
    )
    _RANGE_PATTERN = re.compile(
        r"(?:normal|ref(?:erence)?|range)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)",
        re.I,
    )
    _LESS_THAN_RANGE_PATTERN = re.compile(r"(?:<|<=|upto|up\s*to|below)\s*(\d+(?:[\.,]\d+)?)", re.I)
    _GREATER_THAN_RANGE_PATTERN = re.compile(r"(?:>|>=|at\s*least|above)\s*(\d+(?:[\.,]\d+)?)", re.I)
    _VALUE_PATTERN = re.compile(r"(-?\d+(?:[\.,]\d+)?)")
    _UNIT_PATTERN = re.compile(r"\b(mg\s*/\s*dl|mgdl|mmol\s*/\s*l|mmhg|mm\s*hg|bpm|%)\b", re.I)
    _GENERIC_BP_PATTERN = re.compile(r"\b(\d{2,3})\s*/\s*(\d{2,3})\s*(?:mmhg)?\b", re.I)

    _ALIASES: dict[MetricCode, tuple[str, ...]] = {
        MetricCode.total_cholesterol: (
            "total cholesterol",
            "cholesterol total",
            "total chol",
            "total cholestrol",
            "cholesterol",
            "tc",
            "chol",
        ),
        MetricCode.ldl: ("ldl", "ldl-c", "ldl c", "ldl cholesterol", "ld1", "l d l"),
        MetricCode.hdl: ("hdl", "hdl-c", "hdl c", "hdl cholesterol", "hd1", "h d l"),
        MetricCode.triglycerides: ("triglycerides", "triglyceride", "tri glycerides", "tg", "trigs"),
        MetricCode.heart_rate: ("heart rate", "pulse", "pulse rate", "pr", "hr"),
        MetricCode.oxygen_saturation: (
            "oxygen saturation",
            "spo2",
            "spo 2",
            "o2 sat",
            "sao2",
            "saturation",
        ),
    }

    _DEFAULT_UNITS: dict[MetricCode, str] = {
        MetricCode.total_cholesterol: "mg/dL",
        MetricCode.ldl: "mg/dL",
        MetricCode.hdl: "mg/dL",
        MetricCode.triglycerides: "mg/dL",
        MetricCode.blood_pressure_systolic: "mmHg",
        MetricCode.blood_pressure_diastolic: "mmHg",
        MetricCode.heart_rate: "bpm",
        MetricCode.oxygen_saturation: "%",
    }

    @staticmethod
    def _to_float(value: str) -> float:
        return float(value.replace(",", "."))

    @staticmethod
    def _extract_range(line: str) -> tuple[float | None, float | None]:
        range_match = ParserService._RANGE_PATTERN.search(line)
        if range_match:
            return (
                ParserService._to_float(range_match.group(1)),
                ParserService._to_float(range_match.group(2)),
            )

        # Handles ranges written as "< 200" or ">= 40"
        lt_match = ParserService._LESS_THAN_RANGE_PATTERN.search(line)
        gt_match = ParserService._GREATER_THAN_RANGE_PATTERN.search(line)

        low = ParserService._to_float(gt_match.group(1)) if gt_match else None
        high = ParserService._to_float(lt_match.group(1)) if lt_match else None
        return low, high

    @classmethod
    def _extract_value_and_unit_from_line(
        cls, line: str, aliases: tuple[str, ...]
    ) -> tuple[float | None, str | None]:
        normalized = line.lower()

        alias_positions = [normalized.find(alias) for alias in aliases if normalized.find(alias) >= 0]
        start_idx = min(alias_positions) if alias_positions else 0
        value_candidates = list(cls._VALUE_PATTERN.finditer(line))
        if not value_candidates:
            return None, None

        # Prefer a value that appears after the metric alias token.
        candidate = None
        for match in value_candidates:
            if match.start() >= start_idx:
                candidate = match
                break
        if candidate is None:
            candidate = value_candidates[0]

        value = cls._to_float(candidate.group(1))

        # Avoid using a pure index token like "1" as the measurement value.
        if value.is_integer() and value < 5 and len(value_candidates) > 1:
            next_candidate = value_candidates[1]
            value = cls._to_float(next_candidate.group(1))

        unit_match = cls._UNIT_PATTERN.search(line)
        unit = unit_match.group(1) if unit_match else None
        if unit:
            unit = re.sub(r"\s+", "", unit).replace("mgdl", "mg/dL").replace("mmhg", "mmHg")
        return value, unit

    @classmethod
    def _line_mentions_alias(cls, line: str, aliases: tuple[str, ...]) -> bool:
        lowered = line.lower()
        return any(alias in lowered for alias in aliases)

    def extract_measurement_date(self, text: str) -> datetime | None:
        normalized = " ".join(text.split())

        for pattern in self._DATE_PATTERNS:
            match = pattern.search(normalized)
            if not match:
                continue
            try:
                if pattern is self._DATE_PATTERNS[0]:
                    year, month, day = map(int, match.groups())
                else:
                    day, month, year = map(int, match.groups())
                return datetime(year, month, day, tzinfo=UTC)
            except ValueError:
                continue

        return None

    def parse(
        self, text: str, fallback_date: datetime | None = None
    ) -> list[ParsedMeasurement]:
        measured_at = fallback_date or datetime.now(tz=UTC)
        parsed: list[ParsedMeasurement] = []
        seen_codes: set[MetricCode] = set()

        lines = [line.strip() for line in text.splitlines() if line.strip()]

        normalized = " ".join(text.split())

        for metric_code, (pattern, default_unit) in self._PATTERNS.items():
            match = pattern.search(normalized)
            if not match:
                continue
            value = self._to_float(match.group(1))

            normal_low = None
            normal_high = None
            for line in lines:
                if not pattern.search(line):
                    continue
                range_match = self._RANGE_PATTERN.search(line)
                if range_match:
                    normal_low = float(range_match.group(1))
                    normal_high = float(range_match.group(2))
                    break
            parsed.append(
                ParsedMeasurement(
                    metric_code=metric_code,
                    value=value,
                    unit=default_unit,
                    measured_at=measured_at,
                    confidence=0.82,
                    normal_low=normal_low,
                    normal_high=normal_high,
                )
            )
            seen_codes.add(metric_code)

        # Fallback extraction for table-like OCR output lines.
        for line in lines:
            for metric_code, aliases in self._ALIASES.items():
                if metric_code in seen_codes:
                    continue
                if not self._line_mentions_alias(line, aliases):
                    continue

                value, unit = self._extract_value_and_unit_from_line(line, aliases)
                if value is None:
                    continue
                normal_low, normal_high = self._extract_range(line)

                parsed.append(
                    ParsedMeasurement(
                        metric_code=metric_code,
                        value=value,
                        unit=unit or self._DEFAULT_UNITS[metric_code],
                        measured_at=measured_at,
                        confidence=0.76,
                        normal_low=normal_low,
                        normal_high=normal_high,
                    )
                )
                seen_codes.add(metric_code)

        bp_match = self._BP_PATTERN.search(normalized)
        if not bp_match:
            bp_match = self._GENERIC_BP_PATTERN.search(normalized)

        if bp_match:
            systolic = float(bp_match.group(1))
            diastolic = float(bp_match.group(2))
            parsed.append(
                ParsedMeasurement(
                    metric_code=MetricCode.blood_pressure_systolic,
                    value=systolic,
                    unit="mmHg",
                    measured_at=measured_at,
                    confidence=0.8,
                )
            )
            parsed.append(
                ParsedMeasurement(
                    metric_code=MetricCode.blood_pressure_diastolic,
                    value=diastolic,
                    unit="mmHg",
                    measured_at=measured_at,
                    confidence=0.8,
                )
            )

        return parsed
