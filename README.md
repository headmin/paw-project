# PAW - Project
🐾 **PAW** stands for **Privileges Audit Worker**.

This project extends the widely-used SAP Privileges application ([SAP macOS-enterprise-privileges](https://github.com/SAP/macOS-enterprise-privileges)) by providing a centralized audit logging and analytics service in the cloud, specifically designed to facilitate common enterprise macOS deployments that operate under audit scrutiny.

Pushed through secure webhooks from macOS devices running Privileges.app, PAW stores this information in a centralized database, enabling MacAdmins to improve on "need admin rights for..." scenarios by delivering comprehensive audit tracking. For this use case, the PAW API offers several unique capabilities that enhance Privileges deployments:




## Key Features

-   **Real-time Event Collection**: A webhook endpoint captures admin privilege grant/revoke events along with detailed metadata, including user information, machine details, reasons for changes, expiration times, and custom device data. Ideally, the receiving endpoint is protected by mutual TLS (mTLS) with client certificates. Privileges.app version 2.3 and higher supports mTLS with certificates installed in the system keychain.
-   **Advanced Analytics**: Query webhook data with flexible filtering, pagination, and field selection, optimized for business intelligence tools and reporting systems.
-   **Summary Statistics**: Access pre-built analytics endpoints that provide event counts by type, identify top users by privilege requests, highlight the most common escalation reasons, and reveal trends over time.
-   **Multi-format Export**: Generate exports in CSV and JSON formats, allowing customization of time periods and event filtering for compliance reporting and data analysis.
-   **Token-based Security**: A robust API authentication system featuring role-based permissions and token management.
-   **Contextual Data**: Automatically extracts client version, platform details, and custom device telemetry.

This solution enhances IT teams' visibility into privilege usage patterns across their macOS fleet, ensuring security compliance, identifying improvement opportunities, and generating detailed audit reports. It's especially beneficial for meeting stringent governance requirements, such as UK Cyber Essentials and other regulatory standards.


## Deploy to Cloudflare

### Quick Setup: One-Click Deploy Button

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/headmin/paw-test)

⚠️ **Note**: The deploy button does not automatically manage the initial schema migration for the database (D1). An additional GitHub Actions workflow must be prepared after the initial "Deploy to Cloudflare" deployment by following the further setup instructions in [`deployment-notes.md`](deployment-notes.md).



