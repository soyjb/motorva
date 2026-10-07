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

Application features and database setup will be added in later tasks.
