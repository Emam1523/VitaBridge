@echo off
echo Starting VitaBridge Backend2 (Python FastAPI)...
echo.

REM Check if virtual environment exists
if not exist ".venv" (
    echo Virtual environment not found. Creating one...
    python -m venv .venv
    echo.
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install dependencies if needed
echo Installing/updating dependencies...
pip install -e . --quiet
echo.

REM Run the FastAPI server
echo Starting FastAPI server on http://localhost:8011...
echo Press Ctrl+C to stop the server
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8011 --reload
