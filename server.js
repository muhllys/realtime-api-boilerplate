import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'MODEL_NAME', 'VOICE_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📋 Please copy .env.example to .env and configure all required variables');
  process.exit(1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.openai.com", "wss://api.openai.com"],
      mediaSrc: ["'self'", "blob:"],
    },
  },
}));

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    config: {
      model: process.env.MODEL_NAME,
      voice: process.env.VOICE_ID,
      port: PORT
    }
  });
});

// Generate ephemeral token for OpenAI Realtime API
app.get('/api/session', async (req, res) => {
  try {
    // Generate ephemeral token
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.MODEL_NAME,
        voice: process.env.VOICE_ID,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `OpenAI API Error: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }

    const sessionData = await response.json();
    
    // Log successful token generation (without exposing the token)
    console.log(`✅ Ephemeral token generated successfully for model: ${sessionData.model}`);
    
    res.json(sessionData);

  } catch (error) {
    console.error('❌ Error generating ephemeral token:', error);
    res.status(500).json({ 
      error: 'Internal server error while generating session token',
      message: error.message 
    });
  }
});

// Catch-all handler for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OpenAI Realtime Voice Agent server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 OpenAI API Key: ✅ Configured`);
  console.log(`🎤 Voice: ${process.env.VOICE_ID}`);
  console.log(`🤖 Model: ${process.env.MODEL_NAME}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

export default app; 