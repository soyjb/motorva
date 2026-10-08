CREATE TABLE account_vehicles (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    payload TEXT NOT NULL,
    UNIQUE (owner_id, vehicle_id)
);
CREATE INDEX account_vehicles_owner_idx ON account_vehicles(owner_id);
