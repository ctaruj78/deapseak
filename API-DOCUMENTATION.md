# 🚀 DeapSeak API Documentation

## 📊 Server Status

**Version:** 2.0.0  
**Base URL:** `http://localhost:3000`  
**Status:** ✅ Running

---

## 🔗 Available Endpoints

### Health Check
```bash
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-01T...",
  "uptime": 123.45
}
```

---

## 🔐 Authentication

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@deapseak.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "admin@deapseak.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### Signup
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "User Name",
  "role": "client",
  "phone": "+380501234567"
}
```

### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

### Refresh Token
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}
```

### Logout
```bash
POST /api/auth/logout
Authorization: Bearer <token>
```

---

## 👥 Users Management

### Get All Users (Admin/Dispatcher only)
```bash
GET /api/users?page=1&limit=20&role=admin&search=john
Authorization: Bearer <token>
```

### Get User by ID
```bash
GET /api/users/:id
Authorization: Bearer <token>
```

### Update User
```bash
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "phone": "+380501234567"
}
```

### Delete User (Admin only)
```bash
DELETE /api/users/:id
Authorization: Bearer <token>
```

---

## 🏢 Lifts Management

### Get All Lifts
```bash
GET /api/lifts?page=1&limit=20&status=operational&search=київ
Authorization: Bearer <token>
```

### Get Lift by ID
```bash
GET /api/lifts/:id
Authorization: Bearer <token>
```

### Create Lift (Admin/Dispatcher only)
```bash
POST /api/lifts
Authorization: Bearer <token>
Content-Type: application/json

{
  "address": "вул. Хрещатик, 1, Київ",
  "liftNumber": "L-001",
  "manufacturer": "OTIS",
  "model": "GeN2",
  "capacity": 630,
  "floors": 10,
  "installationDate": "2020-01-15"
}
```

### Update Lift
```bash
PUT /api/lifts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "maintenance",
  "lastMaintenanceDate": "2024-11-01"
}
```

### Delete Lift (Admin only)
```bash
DELETE /api/lifts/:id
Authorization: Bearer <token>
```

### Generate QR Code
```bash
GET /api/lifts/:id/qr
Authorization: Bearer <token>
```

### Get Lift Statistics
```bash
GET /api/lifts/stats
Authorization: Bearer <token>
```

---

## 📋 Requests Management

### Get All Requests
```bash
GET /api/requests?page=1&limit=20&status=pending&priority=urgent
Authorization: Bearer <token>
```

### Get Request by ID
```bash
GET /api/requests/:id
Authorization: Bearer <token>
```

### Create Request
```bash
POST /api/requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "liftId": "...",
  "description": "Ліфт не працює",
  "type": "emergency",
  "priority": "urgent",
  "contactPhone": "+380501234567"
}
```

### Update Request Status
```bash
PUT /api/requests/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "comment": "Розпочато роботи"
}
```

### Assign Technician
```bash
PUT /api/requests/:id/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "technicianId": "..."
}
```

### Add Note
```bash
POST /api/requests/:id/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "comment": "Виявлено проблему з електрикою"
}
```

### Get Request Statistics
```bash
GET /api/requests/stats
Authorization: Bearer <token>
```

---

## 🔐 Test Credentials

After running `node scripts/seed-database.js`:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@deapseak.com | password123 |
| Dispatcher | dispatcher@deapseak.com | password123 |
| Technician | technician@deapseak.com | password123 |
| Client | client@deapseak.com | password123 |

---

## 📊 Response Formats

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional information"
}
```

### Paginated Response
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 🛠️ Management Commands

```bash
# Start server
node api-server.js

# Start with auto-reload
npm run dev

# Quick start (background)
bash quick-start.sh

# Check status
bash server-status.sh

# View logs
bash server-logs.sh

# Stop server
bash server-stop.sh

# Restart server
bash server-restart.sh

# Run tests
bash test-api.sh

# API examples
bash api-examples.sh

# Seed database
node scripts/seed-database.js

# Initialize database
node scripts/init-database.js
```

---

## 📝 Notes

- All authenticated endpoints require `Authorization: Bearer <token>` header
- Tokens expire after 1 hour (configurable in .env)
- Rate limiting: 100 requests per 15 minutes per IP
- Maximum request body size: 10MB

---

## 🐛 Troubleshooting

**Server won't start:**
```bash
# Check if port is in use
lsof -i :3000

# Check MongoDB
pgrep mongod

# View error logs
tail -f logs/error.log
```

**Database connection failed:**
```bash
# Start MongoDB
mongod --dbpath /data/db --fork --logpath /data/db/mongod.log

# Check connection
mongo --eval "db.version()"
```

---

Generated by DeapSeak v2.0.0
