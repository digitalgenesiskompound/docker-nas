FROM python:3.11-slim

WORKDIR /app

# Copy requirements.txt first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the script and other necessary files
COPY webgui.py .
COPY .env .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy the application code
COPY webgui.py /app
COPY templates /app/templates
COPY static /app/static

CMD ["python", "webgui.py"]
