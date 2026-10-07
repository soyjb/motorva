# Motorva Development Guidelines

## Product

Motorva (Motor + Virtual Assistant) is an intelligent vehicle ownership platform.

Motorva gives users a digital garage where they can:
- Add and manage vehicles
- Track mileage and maintenance history
- See upcoming maintenance
- Understand warning lights, OBD codes, and vehicle symptoms
- Determine how urgent a vehicle problem may be
- Determine whether a repair is suitable for DIY
- Show repair difficulty, required tools, parts, and estimated costs
- Find compatible replacement parts
- Compare parts from different retailers
- Find mechanics and dealerships
- Track recalls and vehicle information
- Ask an AI assistant questions about their specific vehicle

The long-term goal is to create one platform for understanding,
maintaining, repairing, and managing a vehicle.

## User Experience

Motorva should feel like a modern digital garage.

Visual direction:
- Premium automotive
- Dark and cinematic
- Modern
- Clean
- Performance-oriented
- Original

General inspiration may come from modern automotive interfaces and
racing-game garages, but proprietary designs and assets must not be copied.

## Technology Stack

Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS

Backend:
- Java 21
- Spring Boot
- Maven

Database:
- PostgreSQL

Infrastructure:
- Docker
- Docker Compose

AI:
- OpenAI API
- Structured outputs
- Tool calling
- Retrieval when appropriate

Development:
- Cursor
- Codex
- Git
- GitHub

## Architecture

Keep frontend and backend separated.

Backend should generally follow:

Controller -> Service -> Repository -> PostgreSQL

Use DTOs for API communication instead of exposing persistence entities.

Business logic belongs in the service layer rather than controllers.

## Engineering Principles

- Make small, reviewable changes.
- Do not implement unrelated features.
- Do not modify unrelated files.
- Prefer simple and maintainable solutions.
- Avoid unnecessary dependencies.
- Validate external input.
- Never commit API keys, passwords, tokens, or credentials.
- Use environment variables for secrets.
- Add tests for important business logic.
- Run relevant tests after changes.
- Never hide failing tests.
- Explain significant architectural decisions.

## Vehicle Safety

Motorva must not rely solely on an LLM for safety-critical vehicle
recommendations.

Safety-critical areas include:
- Brakes
- Steering
- Tires
- Airbags
- Fuel leaks
- Severe overheating
- Critical engine conditions
- Electrical fire risks

Where possible, safety decisions should use deterministic rules and
trusted vehicle or manufacturer data.

AI should interpret, organize, personalize, and explain information
rather than invent vehicle specifications or safety requirements.

When reliable information is unavailable, Motorva should communicate
uncertainty rather than presenting guesses as facts.

## AI Agent Instructions

Before implementing a substantial feature:

1. Inspect the existing repository.
2. Understand the relevant architecture.
3. State a short implementation plan.
4. Make the smallest reasonable change.
5. Run relevant tests or validation.
6. Report what changed.
7. Report failures, uncertainties, or remaining work.

Do not attempt to build the entire Motorva product at once.