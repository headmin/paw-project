# PAW Deployment Notes

This document explains how to set up and deploy the PAW (Privileges Audit Worker) project using GitHub Actions after cloning the repository with the Deploy on Cloudflare button.

## Prerequisites

Before starting the deployment process, ensure you have:

- **Cloudflare Account**: Active account with Workers and D1 database access
- **GitHub Account**: Repository access with Actions enabled
- **Local Development Environment** (optional):
  - Node.js v20.0.0 or later (required for Wrangler 4.19+)
  - OpenSSL (for generating secure tokens)

## Post-Clone Setup: Required GitHub Repository Secrets

After cloning the repository using the Deploy on Cloudflare button, you **must** configure the following three secrets in your GitHub repository to enable automatic deployment.

### Quick Reference Table

| Secret Name | Purpose | How to Obtain |
|-------------|---------|---------------|
| `CLOUDFLARE_ACCOUNT_ID` | Identifies your Cloudflare account | Copy from Cloudflare Dashboard sidebar |
| `CLOUDFLARE_API_TOKEN` | Allows GitHub Actions to deploy Workers | Create token with Workers/D1 permissions |
| `API_TOKEN` | Application authentication token | Generate with `openssl rand -hex 32` |

### How to Add Secrets to GitHub

**Step-by-step process:**

1. **Open your GitHub repository** in a web browser
2. **Click the "Settings" tab** (located in the top navigation bar of your repository)
3. **Navigate to secrets section:**
   - In the left sidebar, click **"Secrets and variables"**
   - Then click **"Actions"** from the dropdown
4. **Add each secret individually:**
   - Click the **"New repository secret"** button
   - Enter the **Name** (exactly as shown in the table above)
   - Paste the **Value** (the actual token/ID)
   - Click **"Add secret"**
   - Repeat for all three secrets

## Detailed Secret Configuration

### 1. CLOUDFLARE_ACCOUNT_ID

**Purpose**: This identifies your Cloudflare account for deployment operations.

**Step-by-step instructions:**
1. **Open Cloudflare Dashboard**: Go to [dash.cloudflare.com](https://dash.cloudflare.com/) and log in
2. **Locate Account ID**: Look at the **right sidebar** on any page
3. **Find the Account ID section**: You'll see a box labeled **"Account ID"**
4. **Copy the ID**: Click the copy button or manually select and copy the alphanumeric string
   - Format looks like: `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p`
5. **Add to GitHub**: Go to your repository secrets and create a new secret named `CLOUDFLARE_ACCOUNT_ID`
6. **Paste the value**: Use the copied Account ID as the secret value

### 2. CLOUDFLARE_API_TOKEN

**Purpose**: Authorizes GitHub Actions to deploy your Worker and manage Cloudflare resources on your behalf.

**Step-by-step instructions:**
1. **Navigate to API Tokens**: Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. **Start token creation**: Click the blue **"Create Token"** button
3. **Choose your method**:

   **🎯 Option A - Use Template (Recommended for beginners):**
   - Find **"Edit Cloudflare Workers"** template
   - Click **"Use template"** button
   - Review the pre-configured permissions (should include Workers and D1)
   - Click **"Continue to summary"**
   - Click **"Create Token"**

   **⚙️ Option B - Custom Token (Advanced users):**
   - Click **"Get started"** under **"Custom token"**
   - **Configure permissions** (add each permission individually):
     ```
     Account - Cloudflare Workers:Edit
     Account - D1:Edit  
     Account - Account Settings:Read
     Zone - Zone Settings:Read (only if using custom domains)
     Zone - Zone:Read (only if using custom domains)
     ```
   - **Set Account Resources**: Select **"Include"** → Choose your specific account
   - **Set Zone Resources**: Select **"Include - All zones"** (if using custom domains)
   - Click **"Continue to summary"**
   - Review all permissions carefully
   - Click **"Create Token"**

4. **⚠️ CRITICAL - Copy token immediately**: 
   - The token will only be shown **once**
   - Copy the entire token string (starts with something like `1a2b3c4d...`)
   - Store it temporarily in a secure location

5. **Add to GitHub**: Create a new repository secret named `CLOUDFLARE_API_TOKEN`
6. **Paste the token**: Use the copied API token as the secret value

### 3. API_TOKEN

**Purpose**: This is your application's internal API token used by the PAW Worker to authenticate and secure API requests.

**Step-by-step instructions:**

1. **Generate a secure random token** using one of these methods:

   **🔧 Method 1 - OpenSSL (Recommended):**
   ```bash
   openssl rand -hex 32
   ```
   - Opens Terminal/Command Prompt
   - Type the command above and press Enter
   - Copy the 64-character result (looks like: `a1b2c3d4e5f6...`)

   **💻 Method 2 - Node.js:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   **🐍 Method 3 - Python:**
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

   **🌐 Method 4 - Online Generator (if other methods unavailable):**
   - Use a reputable password generator
   - Ensure it generates **at least 64 characters**
   - Use only alphanumeric characters (avoid special symbols)

2. **Verify your token**:
   - Should be exactly **64 characters long**
   - Should contain only letters (a-f) and numbers (0-9)
   - Example format: `7f3a8b2c9d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2`

3. **Add to GitHub**: Create a new repository secret named `API_TOKEN`
4. **Paste the generated token**: Use the 64-character string as the secret value

**🔒 Security Note**: This token will be automatically configured as a secret environment variable in your deployed Cloudflare Worker, ensuring it never appears in logs or code.

## Verification: Check Your Secrets

Before proceeding, verify all three secrets are properly configured:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Confirm you see all three secrets listed:
   - ✅ `CLOUDFLARE_ACCOUNT_ID`
   - ✅ `CLOUDFLARE_API_TOKEN` 
   - ✅ `API_TOKEN`

## D1 Database Setup

Before running the deployment, you need to create the D1 database:

### Option 1: Using Wrangler CLI (Recommended)
```bash
# Install Wrangler if you haven't already
npm install -g wrangler@latest

# Login to Cloudflare
wrangler login

# Create the D1 database
wrangler d1 create paw-project-db-new

# Copy the database ID from the output and update wrangler.toml
```

### Option 2: Using Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **D1**
3. Click **Create database**
4. Name it `paw-project-db-new`
5. Copy the Database ID and update your `wrangler.toml` file

## Deployment Process

### Automated Deployment (Recommended)

Once you have configured all the required secrets, deployment is fully automated:

1. **Navigate to Actions**: Go to your GitHub repository → **Actions** tab
2. **Select Workflow**: Click on **"Deploy PAW to Cloudflare Workers"** workflow
3. **Trigger Deployment**: Click **"Run workflow"** button
4. **Configure Options**:
   - **Environment**: Select `production` or `development`
   - **Apply D1 database migrations**: Select `true` (recommended for first deployment)
5. **Start Deployment**: Click **"Run workflow"** to begin

### What Happens During Deployment

The GitHub Actions workflow will automatically:

1. ✅ **Authenticate** with Cloudflare using your API token
2. ✅ **Deploy** your Worker to the specified environment
3. ✅ **Apply database migrations** (if selected) to set up required tables
4. ✅ **Configure** the API_TOKEN as a secure environment variable
5. ✅ **Provide** a deployment summary with the Worker URL

### First Deployment Checklist

For your first deployment, ensure:

- [ ] All three GitHub secrets are configured
- [ ] D1 database has been created
- [ ] `wrangler.toml` contains the correct database ID
- [ ] "Apply D1 database migrations" is set to `true`

### Troubleshooting Common Issues

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| "Database ID not found" | Missing or incorrect database ID in `wrangler.toml` | Create D1 database and update `database_id` |
| "Authentication failed" | Invalid `CLOUDFLARE_API_TOKEN` | Recreate token with correct permissions |
| "Account ID mismatch" | Wrong `CLOUDFLARE_ACCOUNT_ID` | Copy correct Account ID from dashboard |
| "Migration errors" | Invalid SQL or missing database | Check SQL files and ensure database exists |
| "Token permissions insufficient" | Limited API token scope | Recreate token with Workers and D1 edit permissions |

### Detailed Troubleshooting

**Database ID not found:**
- Make sure you've created the D1 database and updated the `database_id` in `wrangler.toml`

**Authentication errors:**
- Verify your `CLOUDFLARE_API_TOKEN` has the correct permissions
- Check that your `CLOUDFLARE_ACCOUNT_ID` is correct

**Migration errors:**
- Ensure your SQL files in the `migrations/` directory are valid
- Check that the database was created successfully

## Post-Deployment Verification

After successful deployment, verify everything is working:

### 1. Check Deployment Status
1. Your Worker will be available at: `https://paw-project-new.YOUR_ACCOUNT_ID.workers.dev`
2. If using a custom domain, it will be available at your configured domain
3. Check the GitHub Actions log for any warnings or errors

### 2. Test the Worker
1. Navigate to your Worker URL
2. Verify the API endpoints respond correctly
3. Test the webhook endpoint using the mTLS test script:
   ```bash
   cd scripts
   ./test-webhook-mtls.sh
   ```
4. **For enhanced security**: Set up client certificates and mTLS authentication
   - 📖 **See detailed guide**: [clientcert-setup.md](clientcert-setup.md)
   - This provides enterprise-grade security for your webhook endpoints

### 3. Monitor in Cloudflare Dashboard
1. Go to **Workers & Pages** in your Cloudflare Dashboard
2. Find your deployed Worker
3. Check the **Metrics** tab for usage statistics
4. Review **Logs** for any runtime errors

## Security Best Practices

### Secret Management
- ❌ **Never commit API tokens or secrets** to your repository
- 🔄 **Regularly rotate** your Cloudflare API tokens (every 90 days recommended)
- 👀 **Monitor** your Worker's usage in the Cloudflare dashboard
- 📊 **Review and audit** API access logs regularly

### Token Security
- 🔐 **Use strong tokens**: Always use `openssl rand -hex 32` or equivalent for API_TOKEN
- 🕐 **Rotate regularly**: Change your API_TOKEN periodically
- 📝 **Document access**: Keep track of who has access to your GitHub repository
- 🚨 **Revoke immediately**: If a token is compromised, regenerate all related secrets

### Monitoring
- Set up Cloudflare alerts for unusual traffic patterns
- Monitor error rates and response times
- Regularly check Worker metrics for performance issues
- Review security logs for suspicious activity

## Local Development Setup

For local development and testing, set up your environment:

### Prerequisites
```bash
# Check your Node.js version (must be v20.0.0+)
node --version

# Install/update Wrangler globally
npm install -g wrangler@latest

# Verify Wrangler version (must be v4.19.0+)
wrangler --version
```

### Local Environment Setup
1. **Clone the repository** (if developing locally)
2. **Install dependencies**: `npm install`
3. **Login to Cloudflare**: `wrangler login`
4. **Create local environment file**: Copy secrets to `.dev.vars` (never commit this file)
5. **Start development server**: `wrangler dev`

## Support and Resources

### Documentation
- **[Client Certificate Setup](clientcert-setup.md)**: Complete guide for mTLS authentication setup
- **[Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)**: Official Workers docs
- **[Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)**: Command-line tool documentation
- **[GitHub Actions Documentation](https://docs.github.com/actions)**: CI/CD automation guide

### Getting Help
- **Cloudflare Community**: [community.cloudflare.com](https://community.cloudflare.com/)
- **GitHub Issues**: Report problems in your repository's Issues tab
- **Cloudflare Support**: Available for Pro/Business/Enterprise accounts

### Common Commands
```bash
# Check deployment status
wrangler status

# View live logs
wrangler tail

# List your Workers
wrangler list

# Update Worker settings
wrangler edit
```

---

**Next Steps**: After completing this deployment guide, your PAW Worker should be fully operational. Test all endpoints and configure any additional security settings as needed for your environment.
