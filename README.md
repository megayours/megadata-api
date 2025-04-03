# API Project

A Bun-based API project using Elysia and Bun's native PostgreSQL driver.

## Prerequisites

- Bun 1.2.8 or later
- PostgreSQL database

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=api
```

## Setup

1. Install dependencies:
```bash
bun install
```

2. Run migrations:
```bash
bun run migrate
```

3. Start the development server:
```bash
bun run dev
```

## API Documentation

Once the server is running, you can access the Swagger documentation at:
```
http://localhost:3000/swagger
```

## Available Endpoints

- `GET /` - Hello World
- `GET /users` - Get all users
- `POST /users` - Create a new user

## Development

The project uses:
- Bun's native SQL driver for PostgreSQL
- Elysia for the web framework
- Swagger for API documentation
- CORS for cross-origin requests 