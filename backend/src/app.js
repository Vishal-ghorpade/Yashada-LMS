import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import rubricRoutes from './routes/rubricRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import { errorHandler } from './middleware/error.js';

// Load environment variables
dotenv.config();

// Establish database connection
connectDB();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173",
    process.env.FRONTEND_URL
  ]
}));
// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rubrics', rubricRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/calendar', calendarRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to YASHADA AI Assessment & Quiz Platform API',
    status: 'online',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
