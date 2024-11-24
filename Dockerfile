# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Install Gunicorn
RUN pip install gunicorn

# Copy the rest of the application code
COPY . .

# Ensure that the VOLUME directory exists
RUN mkdir -p /app/static
RUN mkdir -p /app/templates

# Expose the port the app runs on
EXPOSE 5000

# Define the entrypoint to run the Gunicorn server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "6", "--threads", "4", "--timeout", "300", "webgui:app"]
