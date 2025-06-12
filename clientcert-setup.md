# Cloudflare Client Certificate & mTLS Setup Guide

This guide explains how to secure your PAW Worker webhooks with Cloudflare Client Certificates and mutual TLS (mTLS).

## Overview

mTLS ensures only clients with valid certificates can access your webhook endpoints, providing strong authentication.

## Prerequisites

- Cloudflare account with SSL/TLS access
- Domain proxied through Cloudflare
- Deployed PAW Worker ([deployment-notes.md](deployment-notes.md))
- OpenSSL or similar for certificate generation


## 1. Generate a Client Certificate (Optional: Use Cloudflare Web UI)

You can generate a client certificate either with OpenSSL or directly in the Cloudflare dashboard.

**To generate locally with OpenSSL:**
```bash
cd scripts
openssl genrsa -out client-private.key 2048
openssl req -new -key client-private.key -out client.csr
```
> **Note:** Keep your private key secure. Never commit it to version control.

## 2. Create & Download Certificate in Cloudflare

1. In the **Cloudflare Dashboard**, select your domain.
2. Go to **SSL/TLS** → **Client Certificates**.
3. Click **Create Certificate**.
4. Choose Cloudflare’s CA, RSA 2048-bit, and specify the required hostnames (e.g., `api.yourdomain.com`).
5. Download the `.pem` (certificate) and `.key` (private key) files.

## 3. Prepare Certificate for Deployment

For testing or device deployment, you may need a `.p12` (PKCS#12) bundle. This format is useful for manual testing or for deploying certificates via MDM configuration profiles to a small group of devices.

Setting up Cloudflare to require pre-installed client certificates is possible, but outside the scope of this guide.

**To create a `.p12` file:**
```bash
cd scripts
./create-p12.sh client-cert.pem client-private.key client-cert.p12
```
- Replace filenames as needed.
- The script will prompt you to set an export password for the `.p12` file.

> See the `create-p12.sh` script in the `scripts` folder for details.

Distribute the `.p12` file securely to authorized clients, such as by importing it into the system keychain or deploying to devices via MDM for production environments.

Ensure that the private key installed in the system keychain has the appropriate access permissions. When importing the certificate, change the permissions to “Allow all applications access to this item,” as this is essential for the mTLS use case. In MDM deployments, a similar option is available.

The Privileges app supports mutual TLS when the certificate is stored in the system keychain—no additional configuration is required. However, this functionality is only utilized when operating in webhook mode:

```xml
<key>ServerType</key>
<string>webhook</string>
```


## 3. Enable mTLS for Your Endpoint

1. In **SSL/TLS** → **Origin Server**, find **Client Certificate Authentication**
2. Enable mTLS for your API/webhook subdomain(s)
3. Set mode to **Require** for maximum security

## 4. Enforce mTLS with a WAF Rule

1. Go to **Security** → **WAF** → **Custom rules**
2. Create a rule:
   - **Expression:**
     ```
     (not cf.tls_client_auth.cert_verified and http.request.uri.path eq "/api/v1/webhooks" and http.request.method eq "POST")
     ```
   - **Action:** Block
   - **Priority:** 1

  


## 5. Test mTLS

Use the [`test-webhook-mtls.sh`](./scripts/test-webhook-mtls.sh) script in the `scripts` folder to verify your mTLS setup. This script demonstrates how to make a POST request to your webhook endpoint using the client certificate and key:

```bash
./scripts/test-webhook-mtls.sh
```

Ensure the script paths and certificate filenames match your setup.


## 6. Integrate with PAW Worker

- Update test scripts to use client certificates
- Distribute certs securely to authorized clients
- Plan for certificate renewal and revocation

## Security Tips

- Store private keys securely
- Rotate certificates regularly
- Monitor and alert on failed mTLS attempts
- Review WAF rules and certificate usage

---
**See also:** [deployment-notes.md](deployment-notes.md), [Cloudflare mTLS Docs](https://developers.cloudflare.com/ssl/client-certificates/)
