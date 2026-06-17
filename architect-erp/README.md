# Architect ERP Backend

This is a [Next.js](https://nextjs.org) project bootstrapped with `create-next-app` that serves as the backend architecture for the Architect ERP system.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Architecture**: Classic layered architecture (Controllers, Services, Repositories, Models, Middlewares, Enums) located in the `src/` directory.

## Getting Started

1. **Environment Setup**
   Copy the example environment variables file and fill in your local Postgres database details:
   ```bash
   cp .env.example .env
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Development Server**
   Start the local dev server using:
   ```bash
   npm start
   # or
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The API routes are exposed under `http://localhost:3000/api/...`.

## Architecture Overview
This project strictly enforces separation of concerns by ensuring logic is divided across distinct layers:
- `src/controllers`: Request/response handling and routing logic.
- `src/services`: Core business logic and rules.
- `src/repositories`: Database interaction and query handling.
- `src/models`: TypeORM Entities and database schema definitions.
- `src/middlewares`: Request pipeline interception (e.g., auth, validation).
- `src/enums`: Centralized constant values.

## Available APIs

### Test Endpoint
A simple endpoint set up to demonstrate the layered architecture flow (Route -> Middleware -> Controller -> Service).

- **Method:** `GET`
- **URL:** `http://localhost:3000/api/test`
- **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "message": "Hello directly from the Test Service!",
    "status": "ACTIVE"
  }
  ```
- **Error Response (500 Internal Server Error):** Returns an empty body with a 500 status code header. Errors are logged exclusively to the server console.
