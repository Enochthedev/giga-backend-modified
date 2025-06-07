# GIGA-backend

While using docker to run the code start with:

```
docker-compose up
```

The stack uses PostgreSQL, Redis and RabbitMQ.

Each service exposes a `/health` endpoint for basic health checks.

Additional documentation can be found in each module's README and in `docs/architecture.md`.
