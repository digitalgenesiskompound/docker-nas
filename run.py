from app import create_app

app = create_app()

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000)
    except Exception as e:
        app.logger.exception(f"Failed to start the application: {e}")
