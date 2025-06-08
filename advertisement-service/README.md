# Advertisement Service

Service for posting advertisements. Requires JWT auth.

## Sample Routes
- `GET /health` – health check
- `GET /ads` – list ads
- `GET /ads/{id}` – get ad by id
- `GET /ads/serve` – serve an ad using the built-in algorithm
- `POST /ads` – create an ad (vendor role required)
- `PUT /ads/{id}` – update an ad
- `DELETE /ads/{id}` – remove ad (admin or subadmin)
- dozens more routes for analytics, comments and moderation

## Development
```bash
yarn build
node build/app.js
```
