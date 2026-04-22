from io import BytesIO
import shutil

from PIL import Image
from pypdf import PdfReader
import pytesseract

from app.core.settings import get_settings


class OCRService:
    def __init__(self) -> None:
        settings = get_settings()
        self._tesseract_cmd = settings.tesseract_cmd or shutil.which("tesseract")
        if self._tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = self._tesseract_cmd

    def extract_text(
        self,
        file_bytes: bytes,
        file_name: str | None = None,
        mime_type: str | None = None,
    ) -> str:
        if self._is_pdf(file_name=file_name, mime_type=mime_type):
            text = self._extract_pdf_text(file_bytes)
            if text.strip():
                return text

        if not self._tesseract_cmd:
            raise pytesseract.TesseractNotFoundError()
        image = Image.open(BytesIO(file_bytes)).convert("L")
        return pytesseract.image_to_string(image)

    @staticmethod
    def _is_pdf(file_name: str | None, mime_type: str | None) -> bool:
        if mime_type and "pdf" in mime_type.lower():
            return True
        return bool(file_name and file_name.lower().endswith(".pdf"))

    @staticmethod
    def _extract_pdf_text(file_bytes: bytes) -> str:
        reader = PdfReader(BytesIO(file_bytes))
        page_text: list[str] = []
        for page in reader.pages:
            page_text.append(page.extract_text() or "")
        return "\n".join(page_text)
