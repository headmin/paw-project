-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    machine TEXT NOT NULL,
    event TEXT NOT NULL CHECK (event IN ('corp.sap.privileges.granted', 'corp.sap.privileges.revoked')),
    reason TEXT NOT NULL,
    admin INTEGER NOT NULL, -- boolean stored as INTEGER
    timestamp TEXT NOT NULL, -- ISO 8601 datetime
    expires TEXT, -- ISO 8601 datetime, nullable
    received_at TEXT NOT NULL, -- ISO 8601 datetime
    custom_data TEXT, -- JSON string, nullable
    client_version INTEGER NOT NULL,
    platform TEXT NOT NULL,
    cf_network_version TEXT,
    os_version TEXT,
    delayed INTEGER NOT NULL DEFAULT 0, -- boolean stored as INTEGER
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER,
    expires_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    permissions TEXT NOT NULL,
    is_service_token INTEGER NOT NULL DEFAULT 0
);

-- Create indexes
CREATE INDEX idx_webhooks_timestamp ON webhooks(timestamp);
CREATE INDEX idx_webhooks_event ON webhooks(event);
CREATE INDEX idx_webhooks_user ON webhooks(user);
CREATE INDEX idx_api_keys_key ON api_keys(key);
