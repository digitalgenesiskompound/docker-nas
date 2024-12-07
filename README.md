# Docker Volume Explorer: A Simple Web-Based File Manager

Docker Volume Explorer (DVE) is a lightweight, Flask-based web application for managing files inside a Docker volume or any files from the host system that the Docker container is hosted on. 
It provides a user-friendly web interface to upload, delete, list, and download files.

---

## Features

- **User Authentication:** Secure login/logout and password management.
- **File Management:** Upload, delete, download, add, or edit files and directories.
- **Dockerized:** Easy setup and deployment with Docker Compose.

---

## Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

---

### 1. Clone the Repository
```bash
git clone https://github.com/digitalgenesiskompound/docker-nas.git
cd docker-nas
```

---

### 2. Configure the Environment
Copy the example `.env` file to customize settings:
```bash
cp .env.example .env
```

Edit the `.env` file to configure:
- `SECRET_KEY`: A secure secret key for your application.
*Command to create a random 32 character string*
```
openssl rand -hex 32
```

- `HOST_PATH`: Directory on the host ("/home/user/mydirectory/forstuff") - OR - Set it as a name ("nas") and it will be contained in a Docker volume.

Example `.env` file:
```env
SECRET_KEY=your_secret_key
HOST_PATH=/home/user/mydirectory/forstuff
```

---

### 3. Start the Application
Use Docker Compose to build and start the application:
```bash
docker-compose up -d --build
```

---

### 4. Access the Application
Once the application is running, open your browser and navigate to:
```
http://localhost:5000
```

Login or register to start managing your files.

---

## Stopping the Application
To stop the application run:
```bash
docker-compose down
```

---

## License
This project is licensed under the [MIT License](LICENSE).
```

This version adheres strictly to Markdown formatting and is ready to paste into GitHub as `README.md`. Let me know if you need any other edits!
