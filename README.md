# Esquire Social Media Platform

A full-stack social media application built with React, Express, TypeScript, Prisma, and PostgreSQL.

## 🚀 Features

### Authentication
- User signup and login with JWT
- Secure password hashing with bcrypt
- State and education level user profiles

### Social Features
- **Posts**: Create text posts with optional media attachments
- **Likes**: Like/unlike posts with real-time counts
- **Comments**: Comment on posts
- **Follow System**: Follow/unfollow users
- **Feed**: Personalized feed showing posts from followed users

### Real-time Updates
- **WebSocket Integration**: Live notifications via Socket.IO
- **Real-time Notifications**: Instant updates for:
  - New likes on your posts
  - New comments on your posts
  - New followers

### Search
- **User Search**: Find users by email or name
- **Post Search**: Search through post content
- Advanced filters and results

### Media
- **Image Upload**: Support for JPEG, PNG, WEBP, GIF
- **Video Upload**: MP4 video support
- File size limits and validation
- Media attached to posts

### Notifications
- Notification center with unread count badge
- Mark individual notifications as read
- Mark all notifications as read
- Click to view related content

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express** - REST API server
- **TypeScript** - Type-safe development
- **Prisma ORM** - Database modeling and migrations
- **PostgreSQL** - Relational database
- **Socket.IO** - Real-time WebSocket communication
- **JWT** - Secure authentication
- **Multer** - File upload handling
- **Docker** - Containerization

### Frontend
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast development server and build tool
- **Socket.IO Client** - Real-time updates
- **CSS3** - Modern styling

## 📦 Project Structure

```
api/
├── src/
│   ├── routes/
│   │   ├── auth.ts          # Authentication endpoints
│   │   ├── feed.ts          # Posts, likes, comments
│   │   ├── social.ts        # Follow/unfollow
│   │   ├── search.ts        # User and post search
│   │   ├── notifications.ts # Notification management
│   │   └── uploads.ts       # Media upload
│   ├── middleware/
│   │   └── requireAuth.ts   # JWT authentication middleware
│   ├── app.ts               # Express app setup
│   ├── index.ts             # Server entry with WebSocket
│   ├── prisma.ts            # Prisma client
│   └── notifications.ts     # Notification helpers
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
├── frontend/
│   └── src/
│       ├── App.tsx          # Main React component
│       ├── api.ts           # API client
│       └── styles.css       # Application styles
├── docker-compose.yml       # Docker orchestration
└── Dockerfile               # API container definition
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker Desktop
- npm or yarn

### Installation

1. **Clone and install dependencies**
   ```bash
   cd api
   npm install
   cd frontend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start with Docker**
   ```bash
   docker compose up -d
   ```

4. **Start frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:4000
   - Database: localhost:5434

## 🔌 API Endpoints

### Authentication
- `POST /auth/signup` - Create new user account
- `POST /auth/login` - Login and get JWT token
- `GET /me` - Get current user info

### Feed
- `GET /feed/posts` - Get personalized feed
- `POST /feed/posts` - Create a new post
- `GET /feed/posts/:id` - Get single post
- `POST /feed/posts/:id/like` - Like a post
- `DELETE /feed/posts/:id/like` - Unlike a post
- `POST /feed/posts/:id/comments` - Add comment
- `GET /feed/posts/:id/comments` - Get post comments

### Social
- `POST /social/follow/:userId` - Follow a user
- `DELETE /social/follow/:userId` - Unfollow a user
- `GET /social/following` - List users you follow
- `GET /social/followers` - List your followers

### Search
- `GET /search/users?q=query` - Search for users
- `GET /search/posts?q=query` - Search for posts

### Notifications
- `GET /notifications` - Get all notifications
- `PATCH /notifications/:id/read` - Mark notification as read
- `POST /notifications/read-all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification

### Media
- `POST /uploads/posts/:id` - Upload media to a post

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 🗄️ Database Schema

### Models
- **User**: User accounts with profiles
- **Post**: User-generated posts
- **PostMedia**: Images/videos attached to posts
- **Comment**: Comments on posts
- **Like**: Post likes
- **Follow**: User follow relationships
- **Notification**: Real-time notifications

## 🎨 Frontend Features

### Pages/Views
1. **Authentication** - Sign up and login
2. **Feed** - View and create posts
3. **Search** - Find users and posts
4. **Notifications** - View and manage notifications

### UI Highlights
- Dark theme with modern design
- Responsive layout
- Real-time notification badges
- Tab-based navigation
- Smooth animations and transitions
- Emoji support

## 🧪 Testing

Run tests:
```bash
npm test
```

## 📝 Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5434/esquire
JWT_SECRET=your_secret_key_here
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000
PORT=4000
```

## 🚀 Deployment

The application is containerized and ready for deployment on:
- Docker Swarm
- Kubernetes
- AWS ECS/Fargate
- Fly.io
- Railway
- Render

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.
