-- The application accesses these rows through its trusted backend connection.
-- No policies grant access through Supabase's public REST interface.
ALTER TABLE account_vehicles ENABLE ROW LEVEL SECURITY;
