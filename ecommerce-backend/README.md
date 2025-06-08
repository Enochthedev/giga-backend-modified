# E-commerce Service

Handles products and orders.

## Routes
- `GET /health`
- `GET /orders` – list orders
- `POST /orders` – create an order (customer role)

Run with Docker via root `docker-compose`.
Uses PostgreSQL via `DATABASE_URL` environment variable.
