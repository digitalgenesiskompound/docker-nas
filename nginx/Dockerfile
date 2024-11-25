# Use the official Nginx base image
FROM nginx:latest

# Install OpenSSL for certificate generation
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Remove the default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy the custom Nginx configuration
COPY conf.d/default.conf /etc/nginx/conf.d/

# Copy the entrypoint script
COPY generate_certs.sh /usr/local/bin/generate_certs.sh
RUN chmod +x /usr/local/bin/generate_certs.sh

# Set the entrypoint to the custom script
ENTRYPOINT ["/usr/local/bin/generate_certs.sh"]

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]