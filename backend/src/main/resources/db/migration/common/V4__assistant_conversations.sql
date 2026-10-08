CREATE TABLE assistant_conversations (
    id UUID PRIMARY KEY REFERENCES account_vehicles(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    version BIGINT NOT NULL
);
