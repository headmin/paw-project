#!/bin/zsh
# Script to create a P12 file from a client certificate private key and certificate

# Ensure OpenSSL is available
if ! command -v openssl &> /dev/null; then
    echo "Error: OpenSSL is not installed. Please install OpenSSL first."
    exit 1
fi

# Default values
OUTPUT_FILE="client.p12"
PASSWORD="CHANGE-ME"
FRIENDLY_NAME="PAW Client Certificate"

# Display help
show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Create a P12 (PKCS#12) file from a client certificate private key and certificate"
    echo ""
    echo "Options:"
    echo "  -k, --key FILE       Path to the private key file (required)"
    echo "  -c, --cert FILE      Path to the certificate file (required)"
    echo "  -o, --output FILE    Output P12 file name (default: client.p12)"
    echo "  -p, --password PWD   Password for the P12 file (default: prompt user)"
    echo "  -n, --name NAME      Friendly name for the certificate (default: 'Client Certificate')"
    echo "  -h, --help           Display this help message"
    echo ""
    echo "Example:"
    echo "  $0 -k client.key -c client.crt -o client.p12 -p secretpassword -n \"My Client Cert\""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -k|--key)
            PRIVATE_KEY="$2"
            shift
            shift
            ;;
        -c|--cert)
            CERTIFICATE="$2"
            shift
            shift
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift
            shift
            ;;
        -p|--password)
            PASSWORD="$2"
            shift
            shift
            ;;
        -n|--name)
            FRIENDLY_NAME="$2"
            shift
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if required arguments are provided
if [ -z "$PRIVATE_KEY" ] || [ -z "$CERTIFICATE" ]; then
    echo "Error: Private key and certificate files are required."
    show_help
    exit 1
fi

# Validate that the input files exist
if [ ! -f "$PRIVATE_KEY" ]; then
    echo "Error: Private key file does not exist: $PRIVATE_KEY"
    exit 1
fi

if [ ! -f "$CERTIFICATE" ]; then
    echo "Error: Certificate file does not exist: $CERTIFICATE"
    exit 1
fi

# Prompt for password if not provided
if [ -z "$PASSWORD" ]; then
    echo "Enter password for P12 file (leave empty for no password):"
    read -s PASSWORD
    echo ""
fi

# Create the P12 file
echo "Creating P12 file: $OUTPUT_FILE"
if [ -z "$PASSWORD" ]; then
    # No password
    openssl pkcs12 -export -out "$OUTPUT_FILE" -inkey "$PRIVATE_KEY" -in "$CERTIFICATE" -name "$FRIENDLY_NAME" -passout pass:
else
    # With password
    openssl pkcs12 -export -out "$OUTPUT_FILE" -inkey "$PRIVATE_KEY" -in "$CERTIFICATE" -name "$FRIENDLY_NAME" -passout "pass:$PASSWORD"
fi

# Check if the operation was successful
if [ $? -eq 0 ]; then
    echo "P12 file successfully created: $OUTPUT_FILE"
    
    # Display file information
    echo ""
    echo "File information:"
    openssl pkcs12 -in "$OUTPUT_FILE" -info -noout -passin "pass:$PASSWORD" 2>/dev/null
    
    echo ""
    echo "You can now use this P12 file for client authentication."
    echo "To use it on macOS, install the file into your system keychain (via MDM or manually)."
    echo "After importing, set the certificate to 'Allow all applications access to this item'—this is required for mTLS."
else
    echo "Error: Failed to create P12 file."
    exit 1
fi
