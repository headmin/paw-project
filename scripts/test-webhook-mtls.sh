#!/bin/zsh
# Script to test webhook posting with mTLS authentication
# This script tests if a webhook endpoint requires and properly validates client certificates

# Configuration - modify these variables to match your environment
P12_FILE="client.p12"
P12_PASSWORD="paw2025"
WEBHOOK_URL="https://privileges.macadmin.cloud/api/v1/webhooks"
VERBOSE=true

# Example payload - using SAP Privileges webhook format
PAYLOAD='{
  "user": "jappleseed",
  "machine": "A7B45C3D-8F12-4E56-9D23-F1A8B7C6D5E4",
  "event": "corp.sap.privileges.granted",
  "reason": "mTLS test script",
  "admin": true,
  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "expires": "'$(date -v+5M -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "custom_data": {
    "department": "Developer",
    "name": "My awesome Mac",
    "os_version": "15.4.1", 
    "serial": "XYZ1234567"
  },
  "client_version": 479,
  "platform": "macOS",
  "cf_network_version": "3826.500.111.1.1",
  "os_version": "24.4.0",
  "delayed": false
}'

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
RESET="\033[0m"

echo "${BOLD}===== Testing Webhook mTLS Authentication =====${RESET}\n"

# Function to print section headers
section() {
  echo "${BOLD}${BLUE}$1${RESET}"
}

section "Step 1: Testing webhook without mTLS certificate"
echo "Sending request without client certificate..."
echo "This should ${YELLOW}fail${RESET} if mTLS is required by the server.\n"

curl_result=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  ${VERBOSE:+-v} \
  "$WEBHOOK_URL" 2>&1)

status_code=$(echo "$curl_result" | tail -n1)

if [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
  echo "${GREEN}✓ Correct behavior: Got status $status_code - Server requires client certificate${RESET}"
else
  echo "${RED}✗ Unexpected response: Got status $status_code - Server does NOT require client certificate${RESET}"
fi

echo "\n------------------------------------------------\n"

section "Step 2: Testing webhook with mTLS certificate"
echo "Sending request with client certificate from $P12_FILE..."
echo "This should ${GREEN}succeed${RESET} if mTLS is properly configured.\n"

if [ ! -f "$P12_FILE" ]; then
  echo "${RED}Error: P12 file not found at $P12_FILE${RESET}"
  echo "Please ensure the P12_FILE path is correct."
  exit 1
fi

curl_result=$(curl -s -o /dev/null -w "%{http_code}" \
  --cert-type P12 \
  --cert "$P12_FILE:$P12_PASSWORD" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  ${VERBOSE:+-v} \
  "$WEBHOOK_URL" 2>&1)

status_code=$(echo "$curl_result" | tail -n1)

if [ "$status_code" = "200" ] || [ "$status_code" = "201" ] || [ "$status_code" = "202" ]; then
  echo "${GREEN}✓ Success: Got status $status_code - Server accepted the request with client certificate${RESET}"
else
  echo "${RED}✗ Failed: Got status $status_code - Server rejected the request despite client certificate${RESET}"
  echo "Possible issues:"
  echo "  - Certificate not trusted by the server"
  echo "  - Certificate expired or not yet valid"
  echo "  - Wrong certificate for this endpoint"
  echo "  - Server configuration issue"
fi

echo "\n------------------------------------------------\n"

section "Step 3: Full request with mTLS certificate and response output"
echo "Sending request with client certificate and displaying the full response...\n"

curl \
  --cert-type P12 \
  --cert "$P12_FILE:$P12_PASSWORD" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  ${VERBOSE:+-v} \
  "$WEBHOOK_URL"

echo "\n\n${BOLD}===== Test completed =====${RESET}"