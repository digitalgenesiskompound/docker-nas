# Use the official Python image.
FROM python:3.11-slim

# Set the working directory.
WORKDIR /app

# Copy the current directory contents into the container.
COPY . /app

# Install the dependencies.
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port that the app runs on.
EXPOSE 5000

# Define environment variables.
ENV FLASK_APP=webgui.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Run the application.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "6", "--threads", "4", "--timeout", "300", "webgui:app"]