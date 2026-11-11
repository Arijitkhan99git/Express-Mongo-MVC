# Project guide (for AI assistants and humans)

Read this first. It describes the project, its conventions, current status and the learning plan.
Keep it up to date: when you add an endpoint, an index or change a convention, edit this file in the same change.

## What this is
`users-api`: a small REST API (Express 4 + MongoDB **native driver**, no Mongoose) built as a learning project.
The owner is learning MongoDB in depth (see "Learning plan"), so prefer **explaining and showing real data** over just dropping code.
Run: `npm run dev` (node --watch) or `npm start`. No test suite and no linter yet.

## Stack
Node 18+, Express 4, MongoDB Atlas (`mongodb` v6), `bcrypt`, `jsonwebtoken`, `express-rate-limit`, `helmet`, `cors`, `dotenv`.
Plain CommonJS (`require`), 2-space indent in older files, 4-space in the post files. Match the surrounding file.

## Environment (.env, never commit; template in .env.example)
`PORT`, `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `JWT_EXPIRES_IN` (default 15m), `REFRESH_TOKEN_EXPIRES_DAYS`, `CORS_ORIGINS` (comma separated, empty = block all browsers).
`.env` points at the owner's real Atlas database. **Never run the server or write scripts against it to test.** See "Verifying changes".

## Architecture (MVC, strict layering)
```
index.js                 Express setup, route mounting, connectDB, createIndexes(), listen
src/config/db.js         connectDB(), getDB()
src/routes/*.routes.js   URL + method -> middleware -> controller
src/middleware/*         validation + auth; set req.validatedBody / req.user
src/controllers/*        req/res handling, status codes. No MongoDB code.
src/models/*             MongoDB queries + schema + createIndexes(). No req/res.
src/utils/*              pure helpers
```
Rules:
- Controllers never touch `getDB()`; models never touch `req`/`res`.
- Each model exposes `createIndexes()` and `index.js` calls it at startup (users, refreshToken, posts).
- Collections are accessed through a function, `const postsCollections = () => getDB().collection("posts")`, because the DB is not connected at import time.
- Validation middleware reads a **schema object** exported by the model (`userSchema`, `postSchema`) and runs it through `src/utils/validateFields.js`. Supported rules: `required`, `minLength`, `maxLength`, `maxBytes`, `pattern`/`patternMessage`, `lowercase`, `trim`, `secret`. Cleaned data goes to `req.validatedBody`; failure is `400 { message: "Validation failed", errors: [...] }`.
- Errors: `400` bad input, `401` auth, `404` missing, `409` duplicate (Mongo error code `11000`), `500` with a logged `console.error(..., error)`. `src/middleware/errorHandler.js` is the last middleware.
- `validateObjectId(label)` is a **factory**: always call it, `validateObjectId("post")` -> `400 "Invalid post id"`. Reads `req.params.id`, checks 24 hex chars. It only checks format; the controller returns 404 if nothing is found.
- IDs: store references as real `ObjectId`s (`userId: req.user._id`), never strings, or `$lookup` and `find` comparisons silently fail. JSON output turns them into strings automatically.

## Auth
- Access token: JWT, `sub` = user id, short life. `requireAuth` (`src/middleware/auth.middleware.js`) verifies it, loads the user (password excluded) and sets `req.user`. It is applied in `index.js` to `/api/users` and `/api/posts`.
- `req.user` is the **caller**, not necessarily the owner of the resource. Fine for "creating as me", wrong for showing other people's data. Never send `req.user` whole (it has the email); pick fields.
- Refresh tokens: random value, only its SHA-256 hash is stored in `refresh_tokens`, rotated on use with a `family` id for reuse detection, TTL index deletes expired ones.
- Passwords: bcrypt, max 72 bytes. Rate limits on login, change-password and refresh.

## Endpoints
Auth (`/api/auth`, public unless noted): `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /profile` (auth), `POST /logout-all` (auth), `PATCH /change-password` (auth).

Users (`/api/users`, all need `Authorization: Bearer <accessToken>`): `GET /` (search + pagination), `GET /:id`, `PUT /:id`, `PATCH /:id`, `DELETE /:id` (also deletes that user's refresh tokens, **not their posts**). `POST /` is commented out; registration is `/api/auth/register`.

Posts (`/api/posts`, all need a Bearer token):
- `POST /` body `{ title, details }` (title 3-150 chars, details 10-5000). Saves `{ title, details, userId, createdAt }`. `409` if the same user already has that title.
- `GET /` optional `?search=` (text search over title and details, ranked by relevance), `?page=`, `?limit=` (max 50). No search = newest first. Response `{ data, pagination }`. Posts do **not** include author info yet.
- `GET /:id` returns the post plus `authorName: { first_name, last_name }`, or `authorName: null` if the author's account was deleted.

## Database
Database named by `MONGODB_DB`. Collections and indexes:

| Collection | Document | Indexes |
|---|---|---|
| `users` | `first_name, last_name, email, password(hash)` | unique `{email}` |
| `refresh_tokens` | `tokenHash, userId, family, revokedAt, expiresAt` | unique `{tokenHash}`, TTL `{expiresAt}` (0s), `{userId}`, `{family}` |
| `posts` | `title, details, userId(ObjectId), createdAt` | unique `{userId,title}` (one user can't reuse a title), `{createdAt:-1,_id:-1}` (serves the no-search list sort), text index `post_text_search` on `{title:"text", details:"text"}` weights 10/1 |

Search notes (verified on a real mongod):
- `$text` is word-based with English stemming: "run" matches "running"; no partial words ("runn") and no typo tolerance.
- English **stop words are not indexed**, so searching "again", "this", "for" returns nothing. Setting `default_language: "none"` indexes everything but removes stemming; changing index options means dropping the index first.
- Several words are OR, not AND. A collection can have only one text index.
- Atlas Search (`$search`) would add fuzzy, autocomplete and highlighting; not used yet.

## Verifying changes (important)
There is no test suite. To verify without touching the owner's Atlas data:
1. `node --check <file>` for syntax.
2. For HTTP-level flow, build a tiny Express app in the scratchpad that mounts the real routes/middleware and stubs `src/config/db.js` through `require.cache` with a fake `getDB()`.
3. For real MongoDB behaviour (indexes, `$text`, duplicates), start a throwaway local server: `mongod --dbpath <scratch>/db --port 27999 --bind_ip 127.0.0.1 --fork --logpath <scratch>/mongod.log`, point `MONGODB_URI` at it in the test script only, then `mongosh --port 27999 --eval 'db.getSiblingDB("admin").shutdownServer()'` and delete the dbpath. `mongod` and `mongosh` are installed via Homebrew.
4. Say clearly what was and wasn't run. Do not claim the real server was exercised if it wasn't.
Do not run destructive commands (deleteMany, drop) on the real database; give the command to the owner instead.

## Learning plan (the owner's "Phase 3: MongoDB in depth")
Order chosen: second collection -> data modeling -> aggregation.

| Topic | Status |
|---|---|
| A second collection with a relationship (`posts.userId` -> `users._id`) | Done |
| Data modeling, embed vs reference | Done (posts reference users; author name currently fetched with a second query in `getPostById`) |
| Indexes: compound, text, TTL, unique | Done (all used in this project). `explain()` not practised yet |
| `$text` search | Done on posts. Atlas Search not started |
| **Aggregation**: `$match $group $sort $project $lookup $unwind` | **Next.** First target: `GET /api/posts` returning author name with `$lookup` (put `$skip`/`$limit` before `$lookup`, project only name fields). Then reports such as posts per user |
| Schema validation with `$jsonSchema` | Not started |
| Transactions | Not started (idea: delete a user and their posts together) |
| Update operators `$inc $push $pull $addToSet $unset` | Not started (idea: like counter or tags on posts) |

When teaching: show the sample collection data first, then explain one step at a time, with the query and its result. Use plain language and notes (the owner asked for this style twice). Mention trade-offs and what breaks.

## Known gaps / ideas
- `GET /api/posts` list has no author info (comes with `$lookup`).
- Deleting a user leaves their posts behind (candidate for a transaction or cascade).
- No update/delete endpoints for posts, and no ownership check yet (only the author should edit or delete).
- Title uniqueness is case-sensitive; add `collation: { locale: "en", strength: 2 }` to the unique index if "Hello" and "hello" should clash.
- README.md predates posts and refresh tokens; update it when convenient.
- No automated tests.

## Working agreements
- Don't change code that wasn't asked about; list other problems you notice and let the owner decide.
- Re-read a file before editing it: the owner edits files by hand between turns (a past edit clobbered a commented-out block and another removed an import that was already fixed).
- Commit only when asked. Commit style so far: `feat: ...` / `docs: ...`.
