# Motorva backend

## Local AI assistant prototype

Stop the backend and run `powershell -ExecutionPolicy Bypass -File .\enable-ai-local.ps1`.
The launcher asks for the OpenAI key privately, then the database password;
neither is written to a file. Backend-only `OPENAI_API_KEY` enables the client.
`OPENAI_MODEL` defaults to `gpt-4.1-mini`. The root `.env.example` is documentation,
not automatically loaded. API credit balance/project permissions must be checked
in the OpenAI dashboard. No paid call is made at startup.

`POST /api/vehicles/{id}/assistant` accepts a question of at most 1,000 characters,
requires login and vehicle ownership, and loads context from server records.
Only basic vehicle data, the newest 12 services and up to 12 unfinished reminders
are included. Photos, cost, email, and service notes are excluded. Question text
may itself contain private information; the UI discloses the OpenAI transfer.
Responses API uses `store:false`, which does not imply zero provider retention.
Replies are capped at 500 output tokens, with no automatic retries or tools.

Daily prototype limits: 10 paid attempts per account and 100 across this backend
process. Failed attempts count. Limits are in memory and reset on restart; this
is not a dollar spending guarantee or a distributed production rate limiter.
Configure persistent quotas before public deployment. A browser Cancel stops
waiting but may not cancel upstream generation or billing.

Safety keywords produce a deterministic professional-inspection message without
a paid request. This is a conservative initial guard, not comprehensive symptom
triage; AI is for records/general education and cannot certify driving safety.
Questions and replies are not persisted in the garage. Live OpenAI verification
requires a valid user-supplied API key; automated tests use mocks and cost nothing.

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

### Saved vehicle conversations

Each account vehicle has a separate conversation in motorva.assistant_conversations.
Authenticated GET/POST/DELETE /api/vehicles/{id}/assistant load, append a successful
question/answer exchange, or clear it. Ownership is checked before history access or
provider calls. Deleting the vehicle cascades to its conversation. PostgreSQL RLS
blocks direct public API access. Optimistic locking rejects conflicting saves.

The last four exchanges accompany current vehicle records on each provider request;
all messages remain saved up to 100 exchanges, after which the user must clear the
conversation. Provider failures do not append messages. Safety concerns in previous
messages trigger the deterministic safety response for immediate ambiguous follow-ups.
Routine maintenance questions can start a new topic without clearing history. The
symptom rules are a prototype, not a comprehensive vehicle safety assessment. Tests use mocks and safety responses,
so they do not spend API credits. Conversations from before this feature cannot be
recovered. Restarting the backend applies the database migrations automatically.

Safety replies now give symptom-specific next steps, possible explanations, and
clarifying questions, with a source URL in each covered response. Brakes, tires,
steering, overheating, fuel leaks, smoke/fire, and airbag warnings use reviewed
general guidance in VehicleSafetyGuidance without calling OpenAI. Fire takes
priority over other reported symptoms. Vague follow-ups retain the last safety
topic; an explicitly different topic does not inherit the old warning. These rules
do not certify driving safety, diagnose a fault, or provide repair procedures.
Sources reviewed: NHTSA TireWise, USFA Vehicle Fire Safety, The AA brake symptoms,
dashboard warning lights and petrol-smell guides, and AAA Oregon/Idaho overheating
guidance. Source URLs are stored alongside the respective response text.
