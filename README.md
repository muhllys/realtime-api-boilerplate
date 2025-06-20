# 🎙️ OpenAI Realtime Voice Agent

A production-ready, feature-rich voice agent built with OpenAI's Realtime API, WebRTC, and modern web technologies. Experience natural, low-latency voice conversations with GPT-4o through your browser.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-orange.svg)](https://webrtc.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Realtime%20API-black.svg)](https://platform.openai.com/docs/guides/realtime)

## ✨ Features

### 🎯 Core Functionality
- **🗣️ Natural Voice Conversations**: Real-time speech-to-speech interaction with 200-500ms latency
- **🤖 GPT-4o Realtime Integration**: Latest OpenAI model with native audio processing
- **🔄 Voice Interruption**: Naturally interrupt the AI mid-response by speaking
- **🎨 Live Audio Visualization**: Real-time waveforms and level meters for input/output
- **📝 Dynamic Instructions**: Customize AI personality and behavior through the UI
- **💬 Context Injection**: Inject real-time context with interrupt and background modes

### 🛡️ Security & Production Features
- **🔐 Ephemeral Token Security**: Secure token-based authentication with 1-hour expiration
- **🚨 Rate Limiting**: Built-in protection against API abuse
- **🛡️ Security Headers**: Comprehensive security middleware (Helmet, CORS)
- **⚡ WebRTC Optimization**: Direct peer-to-peer audio streaming
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices

### 📊 Advanced Analytics
- **💰 Real-time Cost Tracking**: Live token usage and pricing calculations
- **📈 Multiple Token Types**: Separate tracking for text/audio input/output
- **🏷️ Model-specific Pricing**: Supports different OpenAI model pricing tiers
- **📋 Debug Panel**: Comprehensive session info and event logging

### 🔧 Developer Experience
- **🎛️ Live Configuration**: No server restarts needed for instruction changes
- **🧪 Testing Tools**: Manual interrupt testing and voice activity debugging
- **📱 Modern UI/UX**: Clean, intuitive interface with visual feedback
- **🌐 Multi-language Support**: Full UTF-8 support for instructions and context

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **OpenAI API Key** with Realtime API access
- **Modern browser** with WebRTC support (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/muhllys/realtime-api-boilerplate.git
   cd realtime-api-boilerplate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your configuration:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   MODEL_NAME=gpt-4o-realtime-preview-2024-12-17
   VOICE_ID=ash
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` and start talking to your AI!

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Web Browser   │    │   Node.js Server │    │   OpenAI Realtime   │
│                 │    │                  │    │       API           │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────────┐ │
│ │  Voice UI   │◄┼────┼►│ Express.js   │◄┼────┼►│ GPT-4o Realtime │ │
│ │             │ │    │ │              │ │    │ │                 │ │
│ │ WebRTC      │ │    │ │ Security     │ │    │ │ Audio Processing│ │
│ │ Audio       │◄┼────┼►│ Middleware   │ │    │ │                 │ │
│ │ Analysis    │ │    │ │              │ │    │ │ Speech Synthesis│ │
│ └─────────────┘ │    │ │ Token Mgmt   │ │    │ └─────────────────┘ │
└─────────────────┘    │ └──────────────┘ │    └─────────────────────┘
                       └──────────────────┘
```

### Key Components

#### Frontend (`public/`)
- **`index.html`**: Modern, responsive UI structure
- **`styles.css`**: Clean CSS with dark mode support and animations
- **`voice-agent.js`**: Core WebRTC and OpenAI integration logic

#### Backend (`server.js`)
- **Express.js server** with security middleware
- **Ephemeral token generation** for secure API access
- **Rate limiting** and error handling
- **Health check endpoints**

### Technology Stack
- **Frontend**: Vanilla JavaScript, CSS3, WebRTC
- **Backend**: Node.js, Express.js
- **Security**: Helmet, CORS, Rate Limiting
- **Audio**: Web Audio API, MediaStream API
- **Real-time**: WebRTC Data Channels
- **AI**: OpenAI Realtime API (GPT-4o)

## 📖 Usage Guide

### Basic Voice Interaction

1. **Configure AI Instructions**
   - Enter custom instructions in the top textarea
   - Examples: "You are a helpful coding assistant" or "Speak like a pirate"
   - Instructions apply when starting a new session

2. **Start Voice Session**
   - Click "Start Voice Session"
   - Allow microphone access when prompted
   - Wait for "Connected" status

3. **Have Natural Conversations**
   - Speak naturally - the AI will respond in real-time
   - Watch the audio visualizations for input/output levels
   - Conversation history appears in the log

### Advanced Features

#### Voice Interruption
- **Automatic**: Enable "Voice Interruption" checkbox (default: ON)
- **Manual**: Use "Test Interrupt" button during AI responses
- **Natural Flow**: Interrupt the AI by speaking, just like human conversation

#### Context Injection
- **Real-time Context**: Add context mid-conversation without breaking flow
- **Interrupt Mode**: Context immediately stops current AI response
- **Background Mode**: AI processes context silently without responding
- **Keyboard Shortcut**: Ctrl/Cmd + Enter to send context

#### Cost Monitoring
- **Live Tracking**: Real-time token usage and cost calculation
- **Detailed Breakdown**: Separate costs for text/audio input/output
- **Model-specific Pricing**: Accurate pricing for different OpenAI models
- **Historical Data**: Track total usage across session

## 🎛️ Configuration

### Environment Variables

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | ✅ | - | `sk-...` |
| `MODEL_NAME` | OpenAI model to use | ✅ | - | `gpt-4o-realtime-preview-2024-12-17` |
| `VOICE_ID` | Voice for speech synthesis | ✅ | - | `ash`, `alloy`, `echo` |
| `PORT` | Server port | ❌ | `3000` | `8080` |

### Supported Models
- `gpt-4o-realtime-preview-2024-12-17` (Recommended)
- `gpt-4o-realtime-preview-2024-10-01`

### Supported Voices
- `alloy` - Balanced, neutral
- `ash` - Clear, expressive  
- `ballad` - Warm, engaging
- `coral` - Friendly, upbeat
- `echo` - Professional, clear
- `sage` - Wise, thoughtful
- `shimmer` - Bright, energetic
- `verse` - Calm, soothing

## 🔧 Customization

### Voice Activity Detection
Adjust sensitivity in `public/voice-agent.js`:
```javascript
this.voiceActivityThreshold = 0.005; // Lower = more sensitive
this.voiceActivityCountThreshold = 5; // Frames before trigger
```

### Pricing Configuration
Update pricing in `public/voice-agent.js`:
```javascript
this.modelPricing = {
  "gpt-4o-realtime-preview": {
    textInput: 5.00,      // $/1M tokens
    audioInput: 40.00,    // $/1M tokens
    textOutput: 20.00,    // $/1M tokens
    audioOutput: 80.00    // $/1M tokens
  }
};
```

### UI Theming
Modify CSS variables in `public/styles.css`:
```css
:root {
  --primary-color: #3b82f6;
  --bg-primary: #0f172a;
  --text-primary: #f8fafc;
  /* ... customize colors */
}
```

## 🔍 Troubleshooting

### Common Issues

#### Connection Problems
- **Issue**: "Failed to get session token"
- **Solution**: Check your OpenAI API key and billing status
- **Debug**: Check browser console and server logs

#### Audio Issues
- **Issue**: No audio visualization
- **Solution**: Ensure microphone permissions are granted
- **Debug**: Check browser permissions and WebRTC connection

#### Interruption Not Working
- **Issue**: Voice interruption doesn't work
- **Solution**: Check "Voice Interruption" checkbox is enabled
- **Debug**: Use "Test Interrupt" button and check console logs

#### High Token Usage
- **Issue**: Unexpected high costs
- **Solution**: Monitor debug panel and adjust conversation length
- **Debug**: Check token breakdown in pricing section

### Debug Console
Enable detailed logging by opening browser console (F12):
```javascript
// Voice activity debug logs
Voice Activity Debug: {
  inputLevel: "0.0045",
  threshold: 0.005,
  aboveThreshold: false,
  hasActiveResponse: true
}

// Response lifecycle
🚀 Response created - can now be cancelled
🤖 Assistant started speaking
🛑 Response was cancelled
```

### Health Check
Monitor server health at: `http://localhost:3000/api/health`

## 🚦 API Reference

### Server Endpoints

#### `GET /api/health`
**Description**: Server health and configuration check
**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-12-17T10:30:00.000Z",
  "uptime": 1234.56,
  "config": {
    "model": "gpt-4o-realtime-preview-2024-12-17",
    "voice": "ash",
    "port": 3000
  }
}
```

#### `GET /api/session`
**Description**: Generate ephemeral token for OpenAI Realtime API
**Response**:
```json
{
  "client_secret": {
    "value": "eph_...",
    "expires_at": "2024-12-17T11:30:00.000Z"
  },
  "model": "gpt-4o-realtime-preview-2024-12-17",
  "voice": "ash"
}
```

### WebRTC Events

#### Client → OpenAI Events
- `session.update` - Configure session parameters
- `conversation.item.create` - Add user message/context
- `response.create` - Request AI response
- `response.cancel` - Interrupt active response

#### OpenAI → Client Events
- `session.created` - Session initialized
- `response.created` - Response started (cancellable)
- `response.audio.delta` - Audio chunk received
- `response.audio.done` - Audio complete
- `response.done` - Response finished
- `error` - Error occurred

## 📊 Performance

### Benchmarks
- **Latency**: 200-500ms speech-to-speech
- **Audio Quality**: 24kHz, PCM16 format
- **Bandwidth**: ~50-100 KB/s during conversation
- **Token Efficiency**: Direct audio processing (no STT/TTS overhead)

### Optimization Tips
1. **Use stable internet connection** for best audio quality
2. **Close unnecessary browser tabs** to reduce CPU usage
3. **Use wired headphones** to minimize audio feedback
4. **Monitor token usage** to control costs
5. **Adjust voice sensitivity** based on environment

## 🔒 Security

### Built-in Security Features
- **🔐 Ephemeral Tokens**: 1-hour expiration, no persistent API keys on client
- **🚨 Rate Limiting**: 100 requests per 15 minutes per IP
- **🛡️ CORS Protection**: Configurable cross-origin policies
- **🔒 Security Headers**: CSP, HSTS, and other security headers
- **🎯 Input Validation**: Server-side validation of all inputs

### Best Practices
1. **Keep API keys secure** - never commit to version control
2. **Use HTTPS in production** - encrypt all communications
3. **Monitor usage** - set up billing alerts in OpenAI dashboard
4. **Regular updates** - keep dependencies updated
5. **Environment isolation** - separate dev/staging/production configs

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m 'Add amazing feature'`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style
- Use ES6+ JavaScript features
- Follow existing code formatting
- Add comments for complex logic
- Test all new features
- Update documentation

### Areas for Contribution
- 🌍 **Internationalization**: Multi-language UI support
- 🎨 **Themes**: Additional UI themes and customization
- 📊 **Analytics**: Enhanced usage analytics and reporting
- 🔌 **Integrations**: Third-party service integrations
- 🧪 **Testing**: Automated testing suite
- 📖 **Documentation**: Tutorials and examples

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for the revolutionary Realtime API
- **WebRTC Community** for real-time communication standards
- **Node.js & Express** for robust server framework
- **All Contributors** who help improve this project

## 📞 Support

### Getting Help
- 📚 **Documentation**: Check this README and inline comments
- 🐛 **Issues**: [Create an issue](https://github.com/muhllys/realtime-api-boilerplate/issues) for bugs
- 💡 **Feature Requests**: [Discussion board](https://github.com/muhllys/realtime-api-boilerplate/discussions)
- 📧 **Direct Contact**: [Create an issue](https://github.com/muhllys/realtime-api-boilerplate/issues) for urgent matters

### Resources
- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Built with ❤️ for the future of human-AI interaction**

*Start talking to AI like never before - natural, responsive, and intelligent voice conversations at your fingertips.* 