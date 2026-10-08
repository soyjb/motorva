# Motorva backend

Spring Boot foundation targeting Java 21. Set JAVA_HOME to a Java 21 JDK.

From this directory on Windows:

```powershell
.\mvnw.cmd test
.\mvnw.cmd compile
```

On macOS or Linux, use ./mvnw instead. The wrapper downloads its pinned Maven
version on first use; no separate Maven installation is required.

The context smoke test excludes datasource auto-configuration only for the test,
so it runs without PostgreSQL. It does not verify JPA or database connectivity.
Normal application startup requires PostgreSQL configuration through
SPRING_DATASOURCE_URL, SPRING_DATASOURCE_USERNAME, and SPRING_DATASOURCE_PASSWORD.
No database credentials or defaults are included.

Account vehicle API foundation is implemented at `/api/vehicles` (GET),
`/api/vehicles/{id}` (PUT and DELETE). Requests require a Supabase user bearer
token. Signatures, expiration, issuer, audience, role, and UUID subject are
validated; all repository queries use that authenticated subject as the owner.
Client-supplied owner IDs are never used. Vehicle payloads retain photo, service,
and reminder data. Flyway manages the dedicated `motorva` schema (including its
schema history table), and Hibernate uses that same schema. Supabase's pre-existing
`public` objects are left intact; no baseline-on-migrate bypass is enabled.
Flyway creates tables and enables PostgreSQL row security
without public policies, blocking direct public Supabase REST access. The trusted
backend database connection must use a role permitted to access those rows.

Configuration: `SUPABASE_URL`, `FRONTEND_ORIGIN`, and the three datasource
variables above. Set these in the process environment; Spring does not
automatically read the root `.env` file. Require an asymmetric ES256 or RS256
Supabase signing key. Use a PostgreSQL JDBC connection with verified TLS for
hosted deployments; keep database credentials exclusively in the backend.

The frontend still uses the browser garage. Account UI and cloud integration
remain to be connected after a Supabase project is available. No live account
or database has been configured yet.

Update: account sign-in and garage transport are now connected in the frontend.
Signed-in requests use the bearer token; guest garages use browser storage.
The hosted database connection is still pending validation. Start locally with
`powershell -ExecutionPolicy Bypass -File .\start-local.ps1` and enter the database
password only into the hidden terminal prompt. The password is held in this
process environment and removed when the launcher exits. Keep the backend
terminal open. First download the Supabase CA certificate from Database Settings
under SSL Configuration and save it as `Downloads/prod-ca-2021.crt`. To use
another location, pass `-RootCertificatePath` to the launcher. PostgreSQL uses
that explicit CA with `sslmode=verify-full`, including hostname verification.
Windows trust remains in use for Maven and HTTPS signing-key downloads.
This launcher targets Motorva's Supabase session pooler. Backend startup applies migrations
to the configured database; existing browser data is not imported automatically.

Tests run against H2 in PostgreSQL compatibility mode and check HTTP
authentication, owner isolation, input validation, and persistence. They do not
verify live Supabase signatures, PostgreSQL-specific row security, or hosted
connectivity. PostgreSQL integration validation remains required before launch.
