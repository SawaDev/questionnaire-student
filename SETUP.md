# Quick Setup Guide

## Step 1: Install Dependencies

### Frontend
```bash
npm install
```

### Backend
```bash
cd server
npm install
```

## Step 2: Set Up Database

1. Install PostgreSQL if not already installed
2. Create database:
```bash
createdb exam_portal
```

3. Update `server/.env` with your database credentials:
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/exam_portal
JWT_SECRET=your-secret-key-here
```

## Step 3: Run Database Migrations

```bash
cd server
npm run db:migrate
npm run db:seed
```

This will:
- Create all database tables
- Seed test data (subjects, users, exam, questions)

## Step 4: Start Servers

### Terminal 1 - Backend
```bash
cd server
npm run dev
```

### Terminal 2 - Frontend
```bash
npm run dev
```

## Step 5: Access the Application

1. Open browser to `http://localhost:5173`
2. Login with:
   - **Subject:** Mathematics (MATH101)
   - **Username:** `student1`
   - **Password:** `password123`

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in `server/.env`
- Verify database exists: `psql -l | grep exam_portal`

### Port Already in Use
- Backend default: 3001 (change in `server/.env`)
- Frontend default: 5173 (change in `vite.config.ts`)

### TypeScript Errors
- Restart TypeScript server in your IDE
- Run `npm install` again to ensure all types are installed

### CORS Issues
- Ensure `FRONTEND_URL` in `server/.env` matches your frontend URL
- Default: `http://localhost:5173`

## Production Build

### Backend
```bash
cd server
npm run build
npm start
```

### Frontend
```bash
npm run build
```

Build output will be in `dist/` directory.
