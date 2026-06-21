You are a senior full-stack engineer.

Build a production-ready WhatsApp AI Personal Planner application.

Goal:
A user can manage their tasks through WhatsApp messages. The system understands natural language using Gemini and creates/manages recurring tasks.

Tech stack:
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma ORM
- Auth: JWT authentication
- AI: Google Gemini API
- Deployment ready with Docker Compose

Architecture:

/frontend
- React application
- Clean dashboard UI
- Task list
- Calendar-like view
- User settings
- Mobile responsive

/backend
- Express API
- Prisma
- Authentication
- WhatsApp Cloud API integration
- Gemini integration
- Scheduler service

Features:

1. User system
- Register
- Login
- JWT access token
- User profile

2. Task management
Task fields:

id
userId
title
description
status
priority
repeatType
repeatIntervalDays
lastCompletedAt
nextDueAt
createdAt
updatedAt

Task types:
- one time
- daily
- weekly
- monthly
- custom interval

Examples:
"remind me every 45 days to check backups"

should create:

{
 title:"check backups",
 repeatType:"interval",
 repeatIntervalDays:45
}

3. WhatsApp integration

Create webhook:

POST /api/webhooks/whatsapp

Receive WhatsApp Cloud API messages.

Extract:

phone number
message text
timestamp

Send message to Gemini.

Gemini should return strict JSON:

{
 action:"create_task | complete_task | list_tasks | update_task",
 title:"",
 repeatType:"",
 repeatIntervalDays:null,
 date:null
}

Process result.

Example:

User:
"45 günde bir backup kontrolü yap"

System:
Creates recurring task.

User:
"backup tamamlandı"

System:
Marks task completed and calculates next date.

User:
"yarın ne var?"

System:
Returns tomorrow tasks.

4. Scheduler

Use node-cron.

Every hour:
- Find overdue tasks
- Find tasks due today
- Send WhatsApp notifications

5. WhatsApp sender

Implement:

sendWhatsAppMessage(phone, text)

using Meta Cloud API.

6. Database

Create Prisma schema.

Include migrations.

7. Environment:

.env.example

Include:

DATABASE_URL
JWT_SECRET
GEMINI_API_KEY
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN

8. Docker

Create:

docker-compose.yml

Services:

frontend
backend
postgres

9. Documentation

Create:

README.md

Explain:
- local setup
- database migration
- running
- deployment

Important:
Do not create a toy demo.

Create clean scalable code structure.

Use services/controllers/routes pattern.

Make the project easy to extend later.