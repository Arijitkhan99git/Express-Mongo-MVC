# Users API

A RESTful API built with **Express** and **MongoDB** (native driver) following the MVC pattern. It supports user registration, JWT-based authentication, and full CRUD operations on users — all protected behind token verification.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB Atlas (native driver) |
| Password hashing | bcrypt |
| Authentication | JSON Web Tokens (`jsonwebtoken`) |
| Brute-force protection | `express-rate-limit` |
| Config | `dotenv` |

---

## Project Structure

```
users-api-simple/
├── index.js                        # Entry point — Express setup, DB connect, server start
├── .env                            # Environment variables (never commit this)
├── .env.example                    # Template for .env
└── src/
    ├── config/
    │   └── db.js                   # MongoDB connection (connectDB, getDB)
    ├── controllers/
    │   ├── auth.controller.js      # register, login, profile
    │   └── user.controller.js      # getUsers, getUserById, replaceUser, updateUser, deleteUser
    ├── middleware/
    │   ├── auth.middleware.js      # requireAuth — verifies JWT, attaches req.user
    │   ├── errorHandler.js         # Global Express error handler
    │   ├── validateAuth.js         # validateRegister, validateLogin
    │   ├── validateObjectId.js     # Checks :id is a valid MongoDB ObjectId
    │   └── validateUser.js         # validateUser (POST/PUT), validateUserPartial (PATCH)
    ├── models/
    │   └── user.model.js           # Schema, DB queries — no req/res here
    ├── routes/
    │   ├── auth.routes.js          # /api/auth/*
    │   └── user.routes.js          # /api/users/*
    └── utils/
        ├── escapeRegex.js          # Escapes special chars for safe regex search
        ├── parsePositiveInt.js     # Parses pagination query params safely
        ├── password.js             # hashPassword (bcrypt wrapper)
        ├── token.js                # signToken, verifyToken (JWT wrapper)
        └── validateFields.js       # Field-level validation engine used by middlewares
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (or any MongoDB instance)

### 2. Clone and install
```bash
git clone <repo-url>
cd users-api-simple
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=8000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
MONGODB_DB=expressDB
JWT_SECRET=<generate with the command below>
JWT_EXPIRES_IN=1h
```

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Run the server
```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

Server starts at `http://localhost:8000`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port to listen on (default: `8000`) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `MONGODB_DB` | Yes | Database name |
| `JWT_SECRET` | Yes | Long random string used to sign/verify tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime (default: `1h`) |
| `CORS_ORIGINS` | No | Comma-separated frontend origins allowed to call the API from a browser, e.g. `https://www.testbook.com,http://localhost:3000`. Empty = none allowed |

---

## API Reference

### Public Routes

No token required.

#### `GET /`
Health check.
```
200 OK — "Express API is running!"
```

---

#### `POST /api/auth/register`
Create a new account. Returns a token immediately so the user doesn't have to log in separately.

**Request body:**
```json
{
  "first_name": "Arijit",
  "last_name": "Khan",
  "email": "arijit@example.com",
  "password": "supersecret123"
}
```

**Response `201`:**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "673abc...",
    "first_name": "Arijit",
    "email": "arijit@example.com"
  },
  "accessToken": "eyJhbGci..."
}
```

| Error | Status | Reason |
|---|---|---|
| Missing/invalid fields | 400 | Validation failed |
| Email already taken | 409 | Duplicate email |

---

#### `POST /api/auth/login`
Authenticate and receive a token.

> **Brute-force protection:** max **10 attempts per IP per 15 minutes**. Blocked requests receive `429 Too Many Requests`.

**Request body:**
```json
{
  "email": "arijit@example.com",
  "password": "supersecret123"
}
```

**Response `200`:**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "673abc...",
    "first_name": "Arijit",
    "email": "arijit@example.com"
  },
  "accessToken": "eyJhbGci..."
}
```

| Error | Status | Reason |
|---|---|---|
| Missing fields | 400 | Validation failed |
| Wrong email or password | 401 | `"Invalid email or password"` (same message for both — attackers can't learn which emails exist) |
| Too many attempts | 429 | Rate limit hit |

---

### Protected Routes

Every request must include the token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

| Error | Status | Reason |
|---|---|---|
| No header | 401 | `"No token provided"` |
| Bad/tampered token | 401 | `"Invalid token"` |
| Expired token | 401 | `"Token has expired"` |
| User deleted after token issued | 401 | `"User no longer exists"` |

---

#### `GET /api/auth/profile`
Returns the currently signed-in user.

**Response `200`:**
```json
{
  "user": {
    "_id": "673abc...",
    "first_name": "Arijit",
    "last_name": "Khan",
    "email": "arijit@example.com",
    "createdAt": "2026-10-29T12:00:00.000Z"
  }
}
```

---

#### `GET /api/users`
List users with pagination and optional name search.

**Query params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Results per page (max 50) |
| `name` | string | — | Search by first or last name (partial, case-insensitive) |

**Examples:**
```
GET /api/users
GET /api/users?page=2&limit=5
GET /api/users?name=ari
GET /api/users?name=ari%20kh&page=1
```

**Response `200`:**
```json
{
  "data": [ { "_id": "...", "first_name": "Arijit", "..." : "..." } ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

#### `GET /api/users/:id`
Get a single user by MongoDB `_id`.

**Response `200`:** User object (no password).  
**Response `404`:** `"User not found"`  
**Response `400`:** `"Invalid user ID"` (if `:id` is not a valid ObjectId)

---

#### `PUT /api/users/:id`
Replace a user's profile fields entirely. Requires all fields (`first_name`, `last_name`, `email`). The stored password hash and `createdAt` are preserved automatically.

**Request body:**
```json
{
  "first_name": "Arijit",
  "last_name": "Khan",
  "email": "newemail@example.com"
}
```

**Response `200`:** Updated user object.

---

#### `PATCH /api/users/:id`
Update one or more profile fields. At least one field required.

**Request body (any subset):**
```json
{
  "first_name": "Arj"
}
```

**Response `200`:** Updated user object.

---

#### `DELETE /api/users/:id`
Delete a user permanently.

**Response `200`:**
```json
{
  "message": "User deleted successfully",
  "deletedId": "673abc..."
}
```

---

## How Authentication Works

```
REGISTER / LOGIN
      │
      └── bcrypt hashes password on register
          bcrypt.compare on login
                │
                └── signToken(user._id)
                        │
                        └── JWT: { sub: "_id", iat, exp }
                            signed with JWT_SECRET
                            returned as accessToken

PROTECTED REQUEST
      │
      └── Authorization: Bearer <token>
                │
                └── requireAuth middleware
                        ├── verifyToken()  — checks signature + expiry
                        ├── findUserById() — confirms user still exists in DB
                        └── req.user = user → next()
```

**What the token contains:** only `sub` (user `_id`), `iat`, and `exp`. No email, no password — JWTs are readable by anyone who holds one.

**Token lifetime:** 1 hour (configurable via `JWT_EXPIRES_IN`).

---

## User Schema

| Field | Required | Rules |
|---|---|---|
| `first_name` | Yes | Non-empty string |
| `last_name` | Yes | Non-empty string |
| `email` | Yes | Valid email format, stored lowercase, unique |
| `password` | Yes (register only) | Min 8 chars, max 72 bytes, never returned to client |

---

## Status Code Reference

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 400 | Validation error / bad request |
| 401 | Not authenticated (no token, bad token, wrong credentials) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email) |
| 429 | Too many requests (rate limit) |
| 500 | Internal server error |
