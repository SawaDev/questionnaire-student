# Student Exam Portal

A full-stack exam portal application built with React, TypeScript, Node.js, Express, and PostgreSQL.

## Features

- 🔐 **Secure Authentication** - JWT with HttpOnly cookies
- ⏱️ **Server-Authoritative Timer** - Accurate time tracking that persists across sessions
- 📱 **Responsive Design** - Works on mobile, tablet, and desktop
- 🛡️ **Anti-Cheating** - Focus tracking, copy/paste blocking, tab switch monitoring
- 📊 **Real-time State Sync** - Automatic answer persistence and state restoration
- ✅ **Auto-submit** - Automatic submission when time expires
- 📈 **Detailed Results** - Comprehensive score breakdown and question review

## Tech Stack

### Frontend
- React 19 + TypeScript
- React Router DOM v6
- Vite
- Tailwind CSS v4
- shadcn/ui components
- Axios for API calls
- Sonner for notifications

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT authentication
- bcryptjs for password hashing

## Project Structure

```
├── server/                 # Backend server
│   ├── src/
│   │   ├── db/            # Database schema, migrations, seed
│   │   ├── middleware/    # Auth middleware
│   │   ├── routes/        # API routes
│   │   └── index.ts       # Server entry point
│   └── package.json
├── src/                    # Frontend
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities and API client
│   ├── pages/             # Page components
│   └── App.tsx            # Main app component with routing
└── package.json
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `server` directory:
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/exam_portal
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

4. Create the database:
```bash
createdb exam_portal
```

5. Run migrations and seed:
```bash
npm run db:migrate
npm run db:seed
```

6. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:3001`

### Frontend Setup

1. Install dependencies (from project root):
```bash
npm install
```

2. Create a `.env` file in the project root:
```env
VITE_API_URL=http://localhost:3001/api
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Default Test Credentials

- **Username:** `student1` or `student2`
- **Password:** `password123`
- **Subject:** Mathematics (MATH101)

## Routes

### Frontend Routes
- `/` - Redirects to `/login`
- `/login` - Login page
- `/dashboard` - Pre-exam dashboard
- `/exam/:attemptId` - Exam interface
- `/result/:attemptId` - Results page
- `/unauthorized` - Access denied page
- `*` - 404 Not Found page

### Backend API Routes

#### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `GET /api/auth/subjects` - Get available subjects

#### Exams
- `GET /api/exams/:examId` - Get exam details
- `GET /api/exams/:examId/questions` - Get exam questions

#### Attempts
- `POST /api/attempts/start` - Start new attempt
- `GET /api/attempts/:attemptId/state` - Get attempt state (with timer)
- `POST /api/attempts/:attemptId/answer` - Save answer
- `POST /api/attempts/:attemptId/submit` - Submit attempt
- `POST /api/attempts/:attemptId/focus-log` - Log focus/blur events

#### Results
- `GET /api/results/:attemptId` - Get attempt results

## Key Features Explained

### Server-Authoritative Timer
The timer is calculated server-side based on `startedAt` and `durationSeconds`. The client polls every 5 seconds to sync. This ensures accurate timing even if the user refreshes or returns later.

### Anti-Cheating Measures
- Context menu disabled
- Copy/paste/cut events blocked
- Focus/blur events logged
- Tab switch detection
- Warning shown after first violation

### State Persistence
- Answers are saved to the database immediately
- State is restored from server on page refresh
- Optimistic UI updates for better UX

### Auto-Submit
When the server timer reaches 0, the attempt is automatically submitted and graded.

## Development

### Running Both Servers

In separate terminals:

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

### Building for Production

**Backend:**
```bash
cd server
npm run build
npm start
```

**Frontend:**
```bash
npm run build
npm run preview
```

## Security Notes

- Change `JWT_SECRET` in production
- Use strong database passwords
- Enable HTTPS in production
- Configure CORS properly for production domain
- Consider rate limiting for API endpoints

## License

MIT
