<img src="https://github.com/user-attachments/assets/c74fb1d4-6daa-44a1-8214-52a0f98a78b6" alt="dve-nobg" width="175"/>

# Docker Volume Explorer: A Simple Web-Based File Manager

![Screenshot 2024-12-07 151859](https://github.com/user-attachments/assets/fe2dc8c2-6cc7-4251-89d8-c3a7debb68c7)

Docker Volume Explorer (DVE) is a lightweight, Flask-based web application for managing files inside a Docker volume or any files from the host system that the Docker container is hosted on. 
It provides a user-friendly web interface to upload, delete, list, and download files.

---

## Features

- **User Authentication:** Secure login/logout and password management.
- **File Management:** Upload, delete, download, add, or edit files and directories.
- **Text Editor:** Edit text files in multiple different formats using a VSCode style editor.
- **Dockerized:** Easy setup and deployment with Docker Compose.

---

## Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

---

### 1. Clone the Repository
```bash
git clone https://github.com/digitalgenesiskompound/dve.git
cd dve
```

---

### 2. Configure the Environment
Copy the example `.env` file to customize settings:
```bash
cp .env.example .env
```

Edit the `.env` file to configure:
- `SECRET_KEY`: A secure secret key for your application.

*Command to create a random 32 character string:*
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
docker compose up -d --build
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
docker compose down
```

---
# Screenshots

![Screenshot 2024-12-07 152109](https://github.com/user-attachments/assets/d082ad32-c394-4bdd-9df9-c731c575c6c3)
![Screenshot 2024-12-07 151959](https://github.com/user-attachments/assets/1f318551-4b39-4c11-9309-ab2a72e4fb39)
![Screenshot 2024-12-07 151929](https://github.com/user-attachments/assets/25081d7b-a03c-4f98-b4df-2fecd440e1bd)
![Screenshot 2024-12-07 151813](https://github.com/user-attachments/assets/d59ab5ce-699c-4d06-b02b-e52fca825496)


## License
This project is licensed under the [MIT License](LICENSE).
