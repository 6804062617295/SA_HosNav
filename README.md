# HospitalNav 

Hospital OPD queue management and indoor navigation prototype for a System Analysis course.

## Overview

- **Patient PWA** — Scan QR to track queue status, navigate indoors with step-by-step instructions
- **Staff Website** — Manage queues, generate Queue QR codes, call/forward patients
- **Backend API** — Node.js + Express.js, shared by both frontends
- **Database** — PostgreSQL

## Architecture

```
Patient PWA ──────┐
                  │
                  ▼
             Backend API
                  │
                  ▼
             PostgreSQL
                  ▲
                  │
Staff Website ────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |

## Project Structure

```
 SA_HosNav/
├── frontend/
│   ├── patient/
│   └── staff/
├── backend/
├── database/
├── docs/
└── README.md
```

## License

[MIT](LICENSE)
