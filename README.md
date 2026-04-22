<div align="center">

# 🏛️ Ambassadors Assembly Platform

**Enterprise-Grade Node.js Application Architecture**

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-DB-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-APM-362D59?style=for-the-badge&logo=sentry&logoColor=white)

</div>

<br>

A high-performance, fault-tolerant MVC framework engineered for the Ambassadors Assembly web presence. Built with Express 5, this application utilizes modern architectural patterns including robust CSRF defense layers, Redis-backed rate limiting, centralized exception handling, and edge-ready API integrations.

---

## ⚡ Architecture & Tech Stack

### Domain & Routing Layer

- **Express.js (5.x)**: Next-generation asynchronous routing and middleware execution.
- **EJS (Embedded JavaScript)**: Server-side rendering (SSR) for blazing-fast initial load times and optimized SEO.

### Data & Caching Layer

- **Supabase / PostgreSQL**: Cloud-native, robust database engine handling relational mapping and persistent storage.
- **Redis (ioredis)**: In-memory datastore cluster utilized for high-throughput rate limiting and sub-millisecond caching operations.

### Security Posture (Zero-Trust Model)

- **Helmet**: Secures HTTP headers against top OWASP vulnerabilities.
- **Double-Submit CSRF (`csrf-csrf`)**: Advanced cross-site request forgery protection with dynamic token rotation.
- **Express Rate Limit**: DDoS mitigation and brute-force protection, horizontally scaled via Redis.
- **Zod**: TypeScript-first schema declaration for rigorous deterministic runtime payload validation.

### Telemetry & Observability

- **Sentry**: Application Performance Monitoring (APM), tracing, and error tracking.
- **Winston**: Asynchronous, stream-based leveled global request logging.
- **Express Status Monitor**: Real-time websocket-driven performance metrics (CPU, Memory, Loop delay).

---

## 📂 System Topography

```text
├── config/              # Centralized configuration & dependency injection
├── controllers/         # Business logic & request/response orchestration
├── middlewares/         # Interceptors (Auth, CSRF, Rate-limiting, Error Handlers)
├── public/              # Client-side static assets (compiled CSS/JS)
├── repositories/        # Data access layer (DAL) abstracting Supabase logic
├── routes/              # Express routing definitions mapping controllers
├── services/            # Domain-specific logic independent of HTTP contexts
├── utils/               # AppError classes, generic helpers, and formats
├── validators/          # Zod schema definitions for request boundary checks
└── views/               # EJS template engine fragments and layouts
```

---

## 🚀 Local Development Environment

### 1. Prerequisites

Ensure the following binaries are executed in your $PATH:

- **Node.js** (v18.x or higher)
- **Redis Server** (Local or cloud URI, running on port 6379 natively)

### 2. Environment Virtualization

Clone the repository and bootstrap environment configurations. A `.env.example` file is provided for deterministic scaffolding.

```bash
cp .env.example .env
```

_Populate `.env` with corresponding `SUPABASE_KEY`, `REDIS_URL`, `SENTRY_DSN`, etc._

### 3. Dependency Resolution

```bash
npm install
```

### 4. Bootstrapping

To initialize the developer environment with Hot Module Replacement (HMR) and observability instrumentation enabled:

```bash
npm run dev
```

The application will bind to `http://localhost:3000`.
Monitoring dashboard is exposed at `http://localhost:3000/status`.

---

## 🛠️ CLI Operations

- `npm run start` - Standard production execution (via `instrument.js` for APM).
- `npm run dev` - Watch-mode execution utilizing nodemon.
- `npm run minify` - Invokes custom AST pipeline to minify client-bound assets.
- `npm run clean` - Executable formatters to sanitize trailing whitespaces globally.

---

> _**Maintainer Note**: All logic commits must pass ESLint configuration before PR merge. Treat the `middlewares` directory strictly as pure functions passing context via `res.locals` to prevent execution context leaks._ <br>

<div align="center">
  <sub>Built with ❤️ by the Carix Studio.</sub>
</div>
