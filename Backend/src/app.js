import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.js';
import aiRouter from './routes/ai.js';
import complaintsRouter from './routes/complaints.js';
import adminRouter from './routes/admin.js';

const app = express();

// Flexible CORS system allowing any local ports (Live Server, Vite, Webpack, etc.)
// with credentials enabled so that the JWT session cookie is properly sent and received.
const allowedOriginPatterns = [
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/localhost$/,
  /^http:\/\/127\.0\.0\.1$/,
  /^http:\/\/10\.206\.115\.37:\d+$/,
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      // Also allow the literal string "null" which browsers send when the
      // page is opened via the file:// protocol (e.g. double-clicking index.html).
      if (!origin || origin === 'null') return callback(null, true);

      const isLocalhost = allowedOriginPatterns.some((pattern) => pattern.test(origin));
      if (isLocalhost) {
        callback(null, true);
      } else {
        console.warn(`[CORS Blocked] Request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS (must be a local development server)'));
      }
    },
    credentials: true,
  })
);

// Built-in Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/admin', adminRouter);

// 404 Route Not Found Handler
app.use((req, res, next) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR HANDLER]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error. Please check backend logs.',
  });
});

export default app;
