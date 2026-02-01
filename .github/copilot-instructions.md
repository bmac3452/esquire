# Esquire API - AI Coding Agent Instructions

## Architecture Overview

**Esquire** is a full-stack social media platform with a **monorepo structure**: Express backend API + React frontend.

### Core Components
- **Backend** (`src/`): Node.js/Express REST API with Prisma ORM, WebSocket real-time notifications via Socket.IO
- **Frontend** (`frontend/src/`): React + Vite SPA consuming the API
- **Database** (`prisma/schema.prisma`): PostgreSQL with migrations tracked in `prisma/migrations/`

### Data Model Architecture
```
User (core entity)
├── Posts (user-generated content)
│   ├── Comments (nested feedback)
│   ├── Likes (engagement, unique per user+post)
│   └── PostMedia (attachments: images/videos)
├── Follow relationships (followers/following)
├── Notifications (real-time via Socket.IO)
├── CaseNotes (legal/professional use case)
└── Clients (managed contacts)
```

## Critical Development Workflows

### Local Development
```bash
npm run dev                    # Start API with ts-node-dev (auto-reload)
cd frontend && npm run dev    # Start Vite dev server (separate terminal)
docker-compose up             # PostgreSQL + API in containers
```

### Database Management
```bash
npx prisma migrate dev        # Create/apply migrations with name prompt
npx prisma studio           # GUI for database inspection/editing
```

### Testing & Validation
```bash
npm test                      # Jest (test/** matches *.test.ts)
npx prisma format            # Format schema.prisma
```

## Project-Specific Patterns & Conventions

### Authentication & Authorization
- **JWT tokens** with `sub` claim containing userId (7-day expiration default)
- **Socket.IO auth** via `socket.handshake.auth.token` before connection
- **Express middleware** `requireAuth` parses Bearer tokens, attaches user to `req.user`
- All protected routes require Bearer token in `Authorization` header

**Example** ([src/routes/feed.ts](src/routes/feed.ts#L16)):
```typescript
router.post("/posts", requireAuth, async (req, res) => {
  const userId = (req as any).user.sub;  // Extract from JWT
  // ...
});
```

### Real-time Notifications via Socket.IO
- Users join personal rooms: `socket.join('user:{userId}')`
- Notifications broadcast to specific user room: `io.to('user:{userId}').emit(...)`
- `createNotification()` helper ([src/notifications.ts](src/notifications.ts#L11)) writes DB + emits event
- Never notify the actor: `if (userId === actorId) return;`

**Example trigger**: When user A likes user B's post, create notification for user B

### Zod Validation Pattern
All routes validate input with Zod schemas **before** processing:
```typescript
const PostSchema = z.object({
  content: z.string().min(1).max(5000)
});
const parsed = PostSchema.safeParse(req.body);
if (!parsed.success) return res.status(400).json(parsed.error);
```

### Prisma Relations & Cascading Deletes
- Posts/Comments use `onDelete: Cascade` to auto-clean media/likes on user deletion
- `Follow` model uses compound unique constraint: `@@unique([followerId, followingId])`
- `Like` model similarly prevents duplicate user-post pairs

### Route Organization
- Routes mounted in [src/app.ts](src/app.ts): `/auth`, `/feed`, `/social`, `/search`, `/notifications`, `/uploads`
- Each route file imports Prisma client directly: `import prisma from "../prisma"`
- Error handling via status codes + JSON responses (no custom error classes)

### Media Upload Handling
- [src/routes/uploads.ts](src/routes/uploads.ts) uses Multer
- Files stored in `uploads/` directory
- Supports JPEG, PNG, WEBP, GIF (images), MP4 (video)
- File references stored in `PostMedia` model with `mimeType`, `size`, `filename`

### Environment Configuration
Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Token signing key (dev default: `'dev_secret_change_later'`)
- `CORS_ORIGIN`: Comma-separated origins (dev: `*`)
- `NODE_ENV`: `production` | `development`
- `RATE_LIMIT_MAX`: Max requests per 15min window (default: 200)

## Integration Points & External Dependencies

### Stack Summary
- **Express** + **TypeScript**: Type-safe routing & middleware
- **Prisma** + **PostgreSQL**: Type-safe ORM with migrations
- **Socket.IO**: Real-time WebSocket for notifications
- **bcrypt**: Password hashing (10 salt rounds typical)
- **jsonwebtoken**: JWT token generation/verification
- **Multer**: File upload middleware
- **Helmet**: Security headers, **Compression**: gzip responses, **CORS**: Cross-origin handling

### Frontend-Backend Contract
- API base URL from `VITE_API_URL` env or defaults to `http://localhost:4000`
- Frontend stores JWT in `localStorage` (`token` key)
- All API calls use `request<T>()` helper ([frontend/src/api.ts](frontend/src/api.ts#L18)) for token injection

## Common Development Tasks

**Adding a new route**:
1. Create route file in `src/routes/` (e.g., `src/routes/myfeature.ts`)
2. Import in [src/app.ts](src/app.ts), add `app.use("/myfeature", myfeatureRouter)`
3. Define Zod schemas for input validation
4. Use `requireAuth` middleware for protected endpoints
5. Return JSON responses with explicit status codes

**Creating a database migration**:
1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Migration auto-generated in `prisma/migrations/{timestamp}_{name}/`

**Adding Socket.IO notification**:
1. Call `createNotification()` after the triggering action
2. Socket.IO automatically emits to recipient's personal room
3. Frontend listens to `notification` event via Socket.IO client library

## Notes for AI Agents
- **No auth bypass**: Always enforce `requireAuth` on sensitive endpoints
- **Cascade behavior**: Understand `onDelete: Cascade` prevents orphaned data
- **Test patterns**: Use Supertest with Express app (see [test/auth.e2e.test.ts](test/auth.e2e.test.ts))
- **Error handling**: Keep HTTP status codes semantic (409 for conflicts, 400 for validation, 401 for auth)
- **Prisma relations**: Use `.select()` to exclude sensitive fields; include related data judiciously to avoid N+1 queries
