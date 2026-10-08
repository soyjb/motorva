CREATE TABLE ai_daily_budget (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    usage_day DATE NOT NULL,
    requests INTEGER NOT NULL CHECK (requests >= 0)
);
INSERT INTO ai_daily_budget (id, usage_day, requests) VALUES (1, DATE '1970-01-01', 0);
CREATE TABLE ai_account_usage (
    owner_id UUID PRIMARY KEY,
    usage_day DATE NOT NULL,
    requests INTEGER NOT NULL CHECK (requests >= 0)
);
