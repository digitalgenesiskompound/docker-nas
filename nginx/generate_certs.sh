#!/bin/bash

set -e

CERT_DIR=/etc/nginx/ssl

# Function to generate self-signed certificates
generate_self_signed() {
    echo "Generating self-signed SSL certificates..."
    mkdir -p $CERT_DIR

    # Generate a self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout $CERT_DIR/selfsigned.key \
        -out $CERT_DIR/selfsigned.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"

    # Generate Diffie-Hellman parameters
    openssl dhparam -out $CERT_DIR/dhparam.pem 2048
}

# Check if certificates already exist
if [ ! -f "$CERT_DIR/selfsigned.crt" ] || [ ! -f "$CERT_DIR/selfsigned.key" ] || [ ! -f "$CERT_DIR/dhparam.pem" ]; then
    generate_self_signed
else
    echo "SSL certificates already exist. Skipping generation."
fi

# Start Nginx
exec "$@"