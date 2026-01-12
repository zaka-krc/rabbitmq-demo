#!/bin/bash

# Define directories
CERTS_DIR="./certs"
mkdir -p $CERTS_DIR

echo "--- Generating Self-Signed Certificates for RabbitMQ ---"

# 1. Generate CA (Certificate Authority)
echo "[1/3] Generating CA..."
openssl req -x509 -config openssl.cnf -newkey rsa:2048 -days 3650 \
    -out "${CERTS_DIR}/ca_certificate.pem" -keyout "${CERTS_DIR}/ca_key.pem" \
    -nodes -subj "/CN=MyLocalRabbitMQCA"

# 2. Generate Server Key and CSR (Certificate Signing Request)
echo "[2/3] Generating Server Key and CSR..."
openssl req -newkey rsa:2048 -nodes \
    -keyout "${CERTS_DIR}/server_key.pem" -out "${CERTS_DIR}/server.csr" \
    -subj "/CN=localhost"

# 3. Sign the Server Certificate with the CA
echo "[3/3] Signing Server Certificate..."
openssl x509 -req -in "${CERTS_DIR}/server.csr" -CA "${CERTS_DIR}/ca_certificate.pem" \
    -CAkey "${CERTS_DIR}/ca_key.pem" -CAcreateserial \
    -out "${CERTS_DIR}/server_certificate.pem" -days 3650

# Cleanup CSR and CA key (CA key is usually kept safe, but for dev we leave it or ignore it)
rm "${CERTS_DIR}/server.csr"

echo ""
echo "✅ Certificates generated in ${CERTS_DIR}/"
echo "   - ca_certificate.pem"
echo "   - server_certificate.pem"
echo "   - server_key.pem"
echo ""
echo "Now follow the instructions to copy them to /etc/rabbitmq/certs/"
