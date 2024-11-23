FROM python:3.11-slim

WORKDIR /app

# Copy requirements.txt first for better caching
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy project
COPY . .

# Install Gunicorn
RUN pip install gunicorn

# Expose port
EXPOSE 5000

# Command to run Gunicorn with multiple workers
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "9", "--timeout", "300", "webgui:app"]
