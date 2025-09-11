require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
// Custom modules
const { connectDB } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { securityHeaders } = require('./middleware/securityMiddleware');
const submissionRoutes = require('./routes/submissionRoutes');
const expressLayouts = require('express-ejs-layouts');
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, 
  })
);

// Rate limiting (global)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, try again later.' },
  })
);
app.use(
  '/submit',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many upload attempts, try again later.' },
  })
);

// CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Performance & logging
app.use(compression());
app.use(morgan('combined'));

// Custom headers
app.use(securityHeaders);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

app.use('/', submissionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log(`${signal} received. Shutting down gracefully...`);
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
