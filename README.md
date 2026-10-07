# Motorva

Motorva (Motor + Virtual Assistant) is a planned intelligent vehicle ownership platform: a digital garage for understanding, maintaining, repairing, and managing vehicles.

## The problem

Vehicle ownership information is fragmented across maintenance records, owner's manuals, diagnostic tools, parts retailers, and repair providers. Drivers often struggle to understand a warning, decide how urgently to act, or determine what maintenance or repair their specific vehicle needs.

Motorva aims to bring this information together in a clear, vehicle-aware experience, helping owners make informed decisions and maintain a useful vehicle history.

## Planned core features

- **Digital garage:** Manage vehicles, mileage, and maintenance history.
- **Maintenance planning:** Track upcoming maintenance.
- **Problem understanding:** Explain warning lights, OBD codes, and symptoms, including urgency and uncertainty.
- **Repair guidance:** Assess DIY suitability and explain difficulty, required tools, parts, and estimated costs.
- **Parts discovery:** Find compatible replacement parts and compare retailers.
- **Service discovery:** Find mechanics and dealerships.
- **Recall tracking:** Surface recalls and relevant vehicle information.
- **Vehicle-aware assistant:** Answer questions using vehicle context and reliable information.

The intended experience is a modern, clean digital garage with a premium, dark automotive visual direction and original design.

## Planned technology stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Java 21, Spring Boot, Maven |
| Database | PostgreSQL |
| Infrastructure | Docker, Docker Compose |
| AI | OpenAI API, structured outputs, tool calling, retrieval where appropriate |
| Development | Cursor, Codex, Git, GitHub |

## High-level architecture

The frontend and backend will remain separate. The frontend will communicate with the Spring Boot API using DTOs rather than persistence entities. Business logic will live in the service layer; repositories will handle persistence.

```text
Next.js frontend
       |
       v
Spring Boot API
Controller -> Service -> Repository -> PostgreSQL
                 |
                 v
       AI and trusted data integrations
```

AI will interpret, organize, personalize, and explain information. Safety-critical recommendations must not rely solely on an LLM. Where possible, deterministic rules and trusted vehicle or manufacturer data will inform decisions involving brakes, steering, tires, airbags, fuel leaks, severe overheating, critical engine conditions, and electrical fire risks. When reliable information is unavailable, Motorva will communicate uncertainty rather than invent specifications or safety requirements.

## Current project status

**Early development — repository preparation only.** No application has been scaffolded or implemented. Frontend, backend, database setup, Docker configuration, dependencies, and CI/CD are future work. There are no application setup or run commands yet.

- `AGENTS.md`: Product direction, architecture, and development guidelines.
- `README.md`: Project overview and planned scope.
- `.gitignore`: Excludes local configuration and generated files.
- `.env.example`: Empty placeholders for possible future configuration.

The environment template is provisional; variable names and requirements will be finalized as components are implemented. Copy it to a local `.env` when needed and keep credentials out of version control. OpenAI keys and database credentials belong on the backend and must never be exposed through `NEXT_PUBLIC_*` variables.

Development will proceed through small, reviewable changes following [AGENTS.md](AGENTS.md).
