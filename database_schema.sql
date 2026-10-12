-- NegoSphere SQLite schema
-- Run this in DB Browser for SQLite -> Execute SQL.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255),
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
    is_verified BOOLEAN NOT NULL DEFAULT 0,
    avatar_url VARCHAR(500),
    bio VARCHAR(1000),
    notification_settings_json VARCHAR(4000),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_users_id ON users(id);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

CREATE TABLE IF NOT EXISTS otp_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'signup',
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_otp_tokens_id ON otp_tokens(id);
CREATE INDEX IF NOT EXISTS ix_otp_tokens_email ON otp_tokens(email);

CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    persona TEXT NOT NULL,
    goals_json TEXT NOT NULL,
    constraints_json TEXT NOT NULL,
    objectives_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_agents_id ON agents(id);

CREATE TABLE IF NOT EXISTS negotiations (
    negotiation_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    scenario_id VARCHAR(255) NOT NULL DEFAULT 'vendor_pricing',
    mode VARCHAR(50) DEFAULT 'simulation',
    human_role VARCHAR(50),
    current_round INTEGER NOT NULL DEFAULT 0,
    max_rounds INTEGER NOT NULL DEFAULT 8,
    current_agent_turn VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    participating_agents_json TEXT NOT NULL,
    current_offer_json TEXT,
    previous_offer_json TEXT,
    deadlock_info_json TEXT,
    final_result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);
CREATE INDEX IF NOT EXISTS ix_negotiations_negotiation_id ON negotiations(negotiation_id);
CREATE INDEX IF NOT EXISTS ix_negotiations_user_id ON negotiations(user_id);

CREATE TABLE IF NOT EXISTS negotiation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negotiation_id VARCHAR(255) NOT NULL,
    round INTEGER NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    decision VARCHAR(50) NOT NULL,
    proposed_offer_json TEXT,
    reasoning TEXT NOT NULL,
    parameters_json TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_negotiation_messages_id ON negotiation_messages(id);
CREATE INDEX IF NOT EXISTS ix_negotiation_messages_negotiation_id ON negotiation_messages(negotiation_id);

PRAGMA user_version = 1;
