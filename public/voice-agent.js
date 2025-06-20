/**
 * OpenAI Realtime Voice Agent with WebRTC
 * Implements secure ephemeral token authentication and real-time audio streaming
 */

class VoiceAgent {
  constructor() {
    this.pc = null; // WebRTC PeerConnection
    this.dataChannel = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.inputAnalyser = null;
    this.outputAnalyser = null;
    this.outputAudioElement = null;
    this.sessionData = null;
    this.isConnected = false;
    this.isMuted = false;
    this.eventLog = [];
    
    // Voice interruption tracking
    this.isAssistantSpeaking = false;
    this.hasActiveResponse = false; // Track if there's an active response that can be cancelled
    this.voiceActivityThreshold = 0.005; // Lowered from 0.01 for better sensitivity
    this.voiceActivityDuration = 0;
    this.voiceActivityCountThreshold = 5; // Reduced from 10 for faster response (~50ms)
    this.lastVoiceActivityCheck = 0;
    
    // Token tracking
    this.tokenUsage = {
      inputTextTokens: 0,
      inputAudioTokens: 0,
      outputTextTokens: 0,
      outputAudioTokens: 0
    };
    
    // Pricing configuration (per 1M tokens) - Updated with correct OpenAI pricing
    this.pricing = {
      // Realtime API pricing for GPT-4o (default model)
      textInput: 5.00,      // Text input tokens
      textInputCached: 2.50, // Cached text input tokens
      audioInput: 40.00,    // Audio input tokens  
      audioInputCached: 2.50, // Cached audio input tokens
      textOutput: 20.00,    // Text output tokens
      audioOutput: 80.00    // Audio output tokens
    };
    
    // Model-specific pricing configurations
    this.modelPricing = {
      "gpt-4o-realtime-preview": {
        textInput: 5.00,
        textInputCached: 2.50,
        audioInput: 40.00,
        audioInputCached: 2.50,
        textOutput: 20.00,
        audioOutput: 80.00
      },
      "gpt-4o-mini-realtime-preview": {
        textInput: 0.60,
        textInputCached: 0.30,
        audioInput: 10.00,
        audioInputCached: 0.30,
        textOutput: 2.40,
        audioOutput: 20.00
      },
      "gpt-4o-realtime-preview-2025-06-03": {
        textInput: 5.00,
        textInputCached: 2.50,
        audioInput: 40.00,
        audioInputCached: 2.50,
        textOutput: 20.00,
        audioOutput: 80.00
      }
    };
    
    // Audio visualization
    this.canvas = document.getElementById('audio-canvas');
    this.canvasCtx = this.canvas.getContext('2d');
    this.animationId = null;
    this.inputLevelData = new Uint8Array(128);
    this.outputLevelData = new Uint8Array(128);
    
    // UI elements
    this.elements = {
      startBtn: document.getElementById('start-session'),
      stopBtn: document.getElementById('stop-session'),
      muteBtn: document.getElementById('mute-btn'),
      statusConnection: document.getElementById('status-connection'),
      statusVoice: document.getElementById('status-voice'),
      statusModel: document.getElementById('status-model'),
      conversationLog: document.getElementById('conversation-log'),
      clearLogBtn: document.getElementById('clear-log'),
      inputLevel: document.getElementById('input-level'),
      outputLevel: document.getElementById('output-level'),
      debugContent: document.getElementById('debug-content'),
      sessionInfo: document.getElementById('session-info'),
      eventLog: document.getElementById('event-log'),
      contextInput: document.getElementById('context-input'),
      sendContextBtn: document.getElementById('send-context'),
      interruptContext: document.getElementById('interrupt-context'),
      backgroundContext: document.getElementById('background-context'),
      aiInstructions: document.getElementById('ai-instructions'),
      // Token counter elements
      inputTextTokens: document.getElementById('input-text-tokens'),
      inputAudioTokens: document.getElementById('input-audio-tokens'),
      outputTextTokens: document.getElementById('output-text-tokens'),
      outputAudioTokens: document.getElementById('output-audio-tokens'),
      totalTokens: document.getElementById('total-tokens'),
      inputTextCost: document.getElementById('input-text-cost'),
      inputAudioCost: document.getElementById('input-audio-cost'),
      outputTextCost: document.getElementById('output-text-cost'),
      outputAudioCost: document.getElementById('output-audio-cost'),
      totalCost: document.getElementById('total-cost'),
      currentModel: document.getElementById('current-model'),
      priceTextInput: document.getElementById('price-text-input'),
      priceAudioInput: document.getElementById('price-audio-input'),
      priceTextOutput: document.getElementById('price-text-output'),
      priceAudioOutput: document.getElementById('price-audio-output'),
      priceTextInputCached: document.getElementById('price-text-input-cached'),
      priceAudioInputCached: document.getElementById('price-audio-input-cached'),
      voiceInterruption: document.getElementById('voice-interruption'),
    };
    
    this.setupEventListeners();
    this.setupCanvas();
    this.updateTokenDisplay();
    this.updatePricingDisplay();
  }

  setupEventListeners() {
    this.elements.startBtn.addEventListener('click', () => this.startSession());
    this.elements.stopBtn.addEventListener('click', () => this.stopSession());
    this.elements.muteBtn.addEventListener('click', () => this.toggleMute());
    this.elements.clearLogBtn.addEventListener('click', () => this.clearConversationLog());
    
    // Context injection event listeners
    this.elements.contextInput.addEventListener('input', () => this.updateContextButton());
    this.elements.sendContextBtn.addEventListener('click', () => this.sendContext());
    
    // Enable send button when session is connected
    this.elements.contextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (!this.elements.sendContextBtn.disabled) {
          this.sendContext();
        }
      }
    });
  }

  setupCanvas() {
    // Set canvas size
    this.canvas.width = 400;
    this.canvas.height = 150;
    
    // Start visualization loop
    this.drawVisualization();
  }

  async startSession() {
    try {
      this.updateStatus('Connecting...', 'connecting');
      this.elements.startBtn.disabled = true;
      
      // Reset token usage for new session
      this.resetTokenUsage();
      
      // Get ephemeral token from server
      const response = await fetch('/api/session');
      if (!response.ok) {
        throw new Error(`Failed to get session token: ${response.statusText}`);
      }
      
      this.sessionData = await response.json();
      this.log('system', 'Session token obtained successfully');
      
      // Setup WebRTC
      await this.setupWebRTC();
      
    } catch (error) {
      this.log('error', `Failed to start session: ${error.message}`);
      this.updateStatus('Disconnected', 'disconnected');
      this.elements.startBtn.disabled = false;
    }
  }

  async setupWebRTC() {
    try {
      // Create peer connection with proper configuration
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Get user media
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
          sampleRate: 24000
        } 
      });
      
      // Setup audio analysis for input
      await this.setupInputAudioAnalysis();
      
      // Add audio track to peer connection
      this.mediaStream.getAudioTracks().forEach(track => {
        this.pc.addTrack(track, this.mediaStream);
      });
      
      // Setup data channel for events
      this.dataChannel = this.pc.createDataChannel('oai-events', {
        ordered: true
      });
      
      this.dataChannel.addEventListener('open', () => {
        this.log('system', 'Data channel opened');
        this.sendSessionUpdate();
      });
      
      this.dataChannel.addEventListener('message', (event) => {
        this.handleRealtimeEvent(JSON.parse(event.data));
      });
      
      this.dataChannel.addEventListener('close', () => {
        this.log('system', 'Data channel closed');
      });
      
      this.dataChannel.addEventListener('error', (error) => {
        this.log('error', `Data channel error: ${error}`);
      });
      
      // Handle incoming audio tracks (for output visualization)
      this.pc.addEventListener('track', (event) => {
        this.log('system', 'Received remote audio track');
        this.setupOutputAudioAnalysis(event.streams[0]);
      });
      
      // Handle connection state changes
      this.pc.addEventListener('connectionstatechange', () => {
        this.log('system', `Connection state: ${this.pc.connectionState}`);
        if (this.pc.connectionState === 'connected') {
          this.isConnected = true;
          this.updateStatus('Connected', 'connected');
          this.elements.stopBtn.disabled = false;
          this.elements.muteBtn.disabled = false;
          this.updateContextButton(); // Enable context button when connected
        } else if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'disconnected') {
          this.updateStatus('Disconnected', 'disconnected');
          this.isConnected = false;
          this.updateContextButton(); // Disable context button when disconnected
        }
      });
      
      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      
      this.log('system', `Created SDP offer, sending to OpenAI...`);
      
      // Send offer to OpenAI using the model from session data
      if (!this.sessionData.model) {
        throw new Error('No model specified in session data');
      }
      
      const url = `https://api.openai.com/v1/realtime?model=${this.sessionData.model}`;
      
      this.log('system', `Making request to: ${url}`);
      this.log('system', `Using ephemeral token: ${this.sessionData.client_secret.value.substring(0, 10)}...`);
      
      const sdpResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sessionData.client_secret.value}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      });
      
      this.log('system', `SDP Response status: ${sdpResponse.status} ${sdpResponse.statusText}`);
      
      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        this.log('error', `SDP Response error: ${errorText}`);
        throw new Error(`SDP exchange failed: ${sdpResponse.status} ${sdpResponse.statusText} - ${errorText}`);
      }
      
      const answerSdp = await sdpResponse.text();
      this.log('system', `Received SDP answer (${answerSdp.length} chars)`);
      
      // Check if we got a valid SDP answer
      if (!answerSdp.includes('v=0') || !answerSdp.includes('m=')) {
        this.log('error', `Invalid SDP answer received: ${answerSdp.substring(0, 200)}...`);
        throw new Error('Received invalid SDP answer from OpenAI');
      }
      
      await this.pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });
      
      this.log('system', 'WebRTC connection established successfully');
      
    } catch (error) {
      this.log('error', `WebRTC setup failed: ${error.message}`);
      console.error('Full WebRTC error:', error);
      this.updateStatus('Disconnected', 'disconnected');
      this.elements.startBtn.disabled = false;
    }
  }

  async setupInputAudioAnalysis() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    this.inputAnalyser = this.audioContext.createAnalyser();
    this.inputAnalyser.fftSize = 256;
    this.inputAnalyser.smoothingTimeConstant = 0.8;
    
    source.connect(this.inputAnalyser);
    this.inputLevelData = new Uint8Array(this.inputAnalyser.frequencyBinCount);
  }

  setupOutputAudioAnalysis(stream) {
    try {
      // Create audio element for output
      this.outputAudioElement = new Audio();
      this.outputAudioElement.srcObject = stream;
      this.outputAudioElement.autoplay = true;
      this.outputAudioElement.muted = false; // We want to hear the output
      
      // Create analyser for output visualization
      const outputSource = this.audioContext.createMediaStreamSource(stream);
      this.outputAnalyser = this.audioContext.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.8;
      
      outputSource.connect(this.outputAnalyser);
      this.outputLevelData = new Uint8Array(this.outputAnalyser.frequencyBinCount);
      
      this.log('system', 'Output audio analysis setup complete');
    } catch (error) {
      this.log('error', `Output audio setup failed: ${error.message}`);
    }
  }

  drawVisualization() {
    if (!this.inputAnalyser || !this.outputAnalyser) return;
    
    const canvas = document.getElementById('audio-canvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Get audio data
    const inputData = new Uint8Array(this.inputAnalyser.frequencyBinCount);
    const outputData = new Uint8Array(this.outputAnalyser.frequencyBinCount);
    this.inputAnalyser.getByteFrequencyData(inputData);
    this.outputAnalyser.getByteFrequencyData(outputData);
    
    // Store for level meters
    this.inputLevelData = inputData;
    this.outputLevelData = outputData;
    
    // Draw waveforms
    const halfWidth = canvas.width / 2 - 10;
    this.drawWaveform(ctx, inputData, 0, halfWidth, canvas.height, '#3b82f6', 'Input');
    this.drawWaveform(ctx, outputData, halfWidth + 20, halfWidth, canvas.height, '#10b981', 'Output');
    
    // Update level meters
    const inputLevel = this.getAudioLevel(inputData);
    const outputLevel = this.getAudioLevel(outputData);
    this.updateLevelMeter('input-level', inputLevel);
    this.updateLevelMeter('output-level', outputLevel);
    
    // Voice activity detection for interruption
    this.detectVoiceActivity(inputLevel);
    
    requestAnimationFrame(() => this.drawVisualization());
  }

  drawWaveform(ctx, data, x, width, height, color, label) {
    const barWidth = width / data.length;
    const centerY = height / 2;
    
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    
    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / 255) * (height * 0.8);
      const barX = x + i * barWidth;
      
      // Draw bar from center outward
      ctx.fillRect(barX, centerY - barHeight / 2, barWidth - 1, barHeight);
    }
    
    // Draw label
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width / 2, height - 10);
  }

  getAudioLevel(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return (sum / data.length) / 255;
  }

  updateLevelMeter(elementId, level) {
    const meter = document.getElementById(elementId);
    if (meter) {
      meter.style.width = `${level * 100}%`;
    }
  }

  sendSessionUpdate() {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
    
    if (!this.sessionData.voice) {
      this.log('error', 'No voice specified in session data');
      return;
    }
    
    // Get instructions from UI textarea
    const instructions = this.elements.aiInstructions.value.trim() || 
      'You are a helpful AI assistant. Respond naturally and conversationally.';
    
    // Visual feedback - briefly highlight the instructions textarea
    this.elements.aiInstructions.style.borderColor = '#10b981';
    this.elements.aiInstructions.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
    setTimeout(() => {
      this.elements.aiInstructions.style.borderColor = '';
      this.elements.aiInstructions.style.backgroundColor = '';
    }, 2000);
    
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: instructions,
        voice: this.sessionData.voice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'gpt-4o-transcribe'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        }
      }
    };
    
    this.dataChannel.send(JSON.stringify(sessionUpdate));
    this.log('system', `✅ Session configured with custom instructions (${instructions.length} chars): "${instructions.substring(0, 100)}${instructions.length > 100 ? '...' : ''}"`);
  }

  handleRealtimeEvent(event) {
    this.eventLog.push(event);
    this.updateDebugInfo();
    
    // Track token usage from events
    this.trackTokenUsage(event);
    
    switch (event.type) {
      case 'session.created':
        this.log('system', 'Session created successfully');
        break;
        
      case 'response.created':
        console.log('🚀 Response created - can now be cancelled');
        this.hasActiveResponse = true;
        break;
        
      case 'response.done':
        console.log('✅ Response completed');
        this.hasActiveResponse = false;
        break;
        
      case 'response.cancelled':
        console.log('🛑 Response was cancelled');
        this.hasActiveResponse = false;
        break;
        
      case 'conversation.item.created':
        if (event.item.type === 'message') {
          const role = event.item.role;
          const content = event.item.content?.[0]?.transcript || 
                         event.item.content?.[0]?.text || 
                         '[Audio message]';
          this.log(role, content);
        }
        break;
        
      case 'response.audio_transcript.delta':
        // Handle streaming transcript chunks
        this.appendAssistantTranscript(event.delta);
        break;
        
      case 'response.audio_transcript.done':
        // Complete transcript is available
        if (event.transcript) {
          this.finalizeAssistantTranscript(event.transcript);
        }
        break;
        
      case 'response.audio.delta':
        // Audio is being streamed - we can show this in UI
        if (!this.isAssistantSpeaking) {
          console.log('🤖 Assistant started speaking');
        }
        this.isAssistantSpeaking = true;
        this.showAssistantSpeaking(true);
        break;
        
      case 'response.audio.done':
        console.log('🤖 Assistant stopped speaking');
        this.isAssistantSpeaking = false;
        this.showAssistantSpeaking(false);
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          this.log('user', event.transcript);
        }
        break;
        
      case 'response.content_part.done':
        // Handle completed response content
        if (event.part?.type === 'audio' && event.part?.transcript) {
          // This ensures we have the complete transcript even if streaming failed
          this.ensureAssistantTranscript(event.part.transcript);
        }
        break;
        
      case 'response.output_item.done':
        // Handle completed response item
        if (event.item?.role === 'assistant' && event.item?.content?.[0]?.transcript) {
          this.ensureAssistantTranscript(event.item.content[0].transcript);
        }
        break;
        
      case 'response.text.delta':
        // Handle text response chunks (if using text mode)
        this.appendAssistantTranscript(event.delta);
        break;
        
      case 'error':
        this.log('error', `API Error: ${event.error?.message || 'Unknown error'}`);
        
        // Handle cancellation errors specifically
        if (event.error?.message?.includes('Cancellation failed') || 
            event.error?.message?.includes('no active response')) {
          console.log('⚠️ Cancellation failed - no active response, resetting state');
          this.hasActiveResponse = false;
          // Don't reset speaking state here - let audio events handle it
        }
        break;
        
      default:
        console.log('Unhandled event:', event);
    }
  }

  trackTokenUsage(event) {
    // Track token usage based on event types and data
    try {
      const currentModel = this.sessionData?.model || "gpt-4o-realtime-preview";
      const modelPricing = this.modelPricing[currentModel] || this.pricing;
      
      switch (event.type) {
        case 'conversation.item.input_audio_transcription.completed':
          // User audio input was transcribed
          if (event.transcript) {
            const estimatedTokens = this.estimateTokens(event.transcript);
            const estimatedCost = (estimatedTokens / 1000000) * modelPricing.audioInput;
            this.addTokenUsage('input_audio', estimatedTokens);
            this.log('system', `🎤 Audio input: ~${estimatedTokens} tokens (~$${estimatedCost.toFixed(4)})`);
          }
          break;
          
        case 'response.audio_transcript.done':
          // Assistant audio output was transcribed
          if (event.transcript) {
            const estimatedTokens = this.estimateTokens(event.transcript);
            const estimatedCost = (estimatedTokens / 1000000) * modelPricing.audioOutput;
            this.addTokenUsage('output_audio', estimatedTokens);
            this.log('system', `🔊 Audio output: ~${estimatedTokens} tokens (~$${estimatedCost.toFixed(4)})`);
          }
          break;
          
        case 'conversation.item.created':
          // Track text-based inputs/outputs
          if (event.item?.content?.[0]?.text) {
            const tokens = this.estimateTokens(event.item.content[0].text);
            if (event.item.role === 'user') {
              const estimatedCost = (tokens / 1000000) * modelPricing.textInput;
              this.addTokenUsage('input_text', tokens);
              this.log('system', `💬 Text input: ~${tokens} tokens (~$${estimatedCost.toFixed(4)})`);
            } else if (event.item.role === 'assistant') {
              const estimatedCost = (tokens / 1000000) * modelPricing.textOutput;
              this.addTokenUsage('output_text', tokens);
              this.log('system', `🤖 Text output: ~${tokens} tokens (~$${estimatedCost.toFixed(4)})`);
            }
          }
          break;
          
        case 'response.usage':
          // If OpenAI provides actual usage data, use that instead of estimates
          if (event.usage) {
            this.log('system', `📊 Actual usage data received: ${JSON.stringify(event.usage)}`);
            // Update with actual token counts if provided
            if (event.usage.input_tokens) {
              this.tokenUsage.inputTextTokens = event.usage.input_tokens;
              this.tokenUsage.inputAudioTokens = event.usage.input_audio_tokens || 0;
            }
            if (event.usage.output_tokens) {
              this.tokenUsage.outputTextTokens = event.usage.output_tokens;
              this.tokenUsage.outputAudioTokens = event.usage.output_audio_tokens || 0;
            }
            this.updateTokenDisplay();
          }
          break;
      }
    } catch (error) {
      console.warn('Error tracking token usage:', error);
    }
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is an approximation since actual tokenization depends on the specific tokenizer
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  appendAssistantTranscript(delta) {
    let lastEntry = this.elements.conversationLog.lastElementChild;
    
    // Check if the last entry is an assistant entry that's currently being streamed
    if (!lastEntry || !lastEntry.classList.contains('log-assistant-streaming')) {
      // Create new assistant entry for streaming
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry log-assistant log-assistant-streaming log-assistant-speaking';
      
      logEntry.innerHTML = `
        <div class="log-timestamp">${timestamp}</div>
        <div class="log-content"></div>
      `;
      
      this.elements.conversationLog.appendChild(logEntry);
      lastEntry = logEntry;
    }
    
    // Append the delta to the content
    const contentDiv = lastEntry.querySelector('.log-content');
    contentDiv.textContent += delta;
    this.elements.conversationLog.scrollTop = this.elements.conversationLog.scrollHeight;
  }

  finalizeAssistantTranscript(fullTranscript) {
    let lastEntry = this.elements.conversationLog.lastElementChild;
    
    if (lastEntry && lastEntry.classList.contains('log-assistant-streaming')) {
      // Update the streaming entry with the final transcript
      const contentDiv = lastEntry.querySelector('.log-content');
      contentDiv.textContent = fullTranscript;
      
      // Remove streaming classes
      lastEntry.classList.remove('log-assistant-streaming', 'log-assistant-speaking');
    } else {
      // Create a new entry if no streaming entry exists
      this.log('assistant', fullTranscript);
    }
  }

  ensureAssistantTranscript(transcript) {
    let lastEntry = this.elements.conversationLog.lastElementChild;
    
    // Check if we already have this transcript
    if (lastEntry && lastEntry.classList.contains('log-assistant')) {
      const contentDiv = lastEntry.querySelector('.log-content');
      if (contentDiv.textContent.trim() === transcript.trim()) {
        // We already have this transcript, just clean up classes
        lastEntry.classList.remove('log-assistant-streaming', 'log-assistant-speaking');
        return;
      }
    }
    
    // If we don't have the transcript or it's different, add/update it
    if (lastEntry && lastEntry.classList.contains('log-assistant-streaming')) {
      // Update streaming entry
      const contentDiv = lastEntry.querySelector('.log-content');
      contentDiv.textContent = transcript;
      lastEntry.classList.remove('log-assistant-streaming', 'log-assistant-speaking');
    } else {
      // Create new entry
      this.log('assistant', transcript);
    }
  }

  showAssistantSpeaking(speaking) {
    const lastEntry = this.elements.conversationLog.lastElementChild;
    if (lastEntry && (lastEntry.classList.contains('log-assistant') || lastEntry.classList.contains('log-assistant-streaming'))) {
      if (speaking) {
        lastEntry.classList.add('log-assistant-speaking');
      } else {
        lastEntry.classList.remove('log-assistant-speaking');
      }
    }
  }

  toggleMute() {
    if (!this.mediaStream) return;
    
    this.isMuted = !this.isMuted;
    this.mediaStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });
    
    this.elements.muteBtn.textContent = this.isMuted ? '🔇 Unmute' : '🔇 Mute';
    this.elements.muteBtn.classList.toggle('btn-danger', this.isMuted);
    this.elements.muteBtn.classList.toggle('btn-outline', !this.isMuted);
    
    this.log('system', this.isMuted ? 'Microphone muted' : 'Microphone unmuted');
  }

  stopSession() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.outputAudioElement) {
      this.outputAudioElement.srcObject = null;
      this.outputAudioElement = null;
    }
    
    this.inputAnalyser = null;
    this.outputAnalyser = null;
    this.isConnected = false;
    this.isMuted = false;
    
    this.updateStatus('Disconnected', 'disconnected');
    this.elements.startBtn.disabled = false;
    this.elements.stopBtn.disabled = true;
    this.elements.muteBtn.disabled = true;
    this.elements.muteBtn.textContent = '🔇 Mute';
    this.elements.muteBtn.classList.remove('btn-danger');
    this.elements.muteBtn.classList.add('btn-outline');
    
    // Disable context injection
    this.updateContextButton();
    
    this.log('system', 'Session ended');
  }

  updateStatus(connection, type) {
    this.elements.statusConnection.textContent = connection;
    this.elements.statusConnection.className = `status-value status-${type}`;
    
    // Update other status fields from session data
    if (this.sessionData) {
      this.elements.statusVoice.textContent = this.sessionData.voice || 'Unknown';
      this.elements.statusModel.textContent = this.sessionData.model || 'Unknown';
    }
  }

  log(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    
    logEntry.innerHTML = `
      <div class="log-timestamp">${timestamp}</div>
      <div class="log-content">${message}</div>
    `;
    
    this.elements.conversationLog.appendChild(logEntry);
    this.elements.conversationLog.scrollTop = this.elements.conversationLog.scrollHeight;
  }

  clearConversationLog() {
    this.elements.conversationLog.innerHTML = '';
    this.log('system', 'Conversation log cleared');
    
    // Also reset token usage
    this.resetTokenUsage();
    this.log('system', 'Token usage reset');
  }

  updateDebugInfo() {
    if (this.sessionData) {
      this.elements.sessionInfo.textContent = JSON.stringify({
        model: this.sessionData.model,
        voice: this.sessionData.voice,
        expires_at: this.sessionData.expires_at
      }, null, 2);
    }
    
    this.elements.eventLog.textContent = JSON.stringify(
      this.eventLog.slice(-10), // Show last 10 events
      null, 
      2
    );
  }

  updateContextButton() {
    const hasText = this.elements.contextInput.value.trim().length > 0;
    const isConnected = this.isConnected && this.dataChannel && this.dataChannel.readyState === 'open';
    
    this.elements.sendContextBtn.disabled = !hasText || !isConnected;
  }

  sendContext() {
    const contextText = this.elements.contextInput.value.trim();
    if (!contextText || !this.isConnected) return;
    
    const interruptMode = this.elements.interruptContext.checked;
    const backgroundMode = this.elements.backgroundContext.checked;
    
    try {
      // Track tokens for context injection
      const contextTokens = this.estimateTokens(contextText);
      const currentModel = this.sessionData?.model || "gpt-4o-realtime-preview";
      const modelPricing = this.modelPricing[currentModel] || this.pricing;
      const estimatedCost = (contextTokens / 1000000) * modelPricing.textInput;
      
      this.addTokenUsage('input_text', contextTokens);
      
      // Cancel current response if interrupt mode is enabled
      if (interruptMode) {
        this.sendEvent({
          type: 'response.cancel'
        });
        this.log('system', '🛑 Interrupted current response for context injection');
      }
      
      // Create context item
      this.sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: contextText
          }]
        }
      });
      
      this.log('system', `📝 Context injected: ${contextTokens} tokens (~$${estimatedCost.toFixed(4)}) - "${contextText.substring(0, 50)}${contextText.length > 50 ? '...' : ''}"`);
      
      // Request response unless in background mode
      if (!backgroundMode) {
        this.sendEvent({
          type: 'response.create'
        });
        this.log('system', '🤖 Requesting AI response to context');
      } else {
        this.log('system', '🔇 Context processed in background mode (no response requested)');
      }
      
      // Clear the input
      this.elements.contextInput.value = '';
      this.updateContextButton();
      
      // Log the injection mode
      const modeDescription = [
        interruptMode ? 'Interrupt: ON' : 'Interrupt: OFF',
        backgroundMode ? 'Background: ON' : 'Background: OFF'
      ].join(', ');
      this.log('system', `Context injection mode: ${modeDescription}`);
      
    } catch (error) {
      this.log('error', `Failed to send context: ${error.message}`);
    }
  }

  sendEvent(event) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(event));
      console.log('Sent event:', event);
    } else {
      throw new Error('Data channel not available');
    }
  }

  updateTokenDisplay() {
    // Update token counts
    this.elements.inputTextTokens.textContent = this.tokenUsage.inputTextTokens.toLocaleString();
    this.elements.inputAudioTokens.textContent = this.tokenUsage.inputAudioTokens.toLocaleString();
    this.elements.outputTextTokens.textContent = this.tokenUsage.outputTextTokens.toLocaleString();
    this.elements.outputAudioTokens.textContent = this.tokenUsage.outputAudioTokens.toLocaleString();
    
    const totalTokens = this.tokenUsage.inputTextTokens + this.tokenUsage.inputAudioTokens + 
                       this.tokenUsage.outputTextTokens + this.tokenUsage.outputAudioTokens;
    this.elements.totalTokens.textContent = totalTokens.toLocaleString();
    
    // Update model name
    if (this.sessionData) {
      this.elements.currentModel.textContent = this.sessionData.model || 'Unknown';
    }
    
    // Update costs
    this.updateCostDisplay();
  }

  updateCostDisplay() {
    // Get current model pricing
    const currentModel = this.sessionData?.model || "gpt-4o-realtime-preview";
    const modelPricing = this.modelPricing[currentModel] || this.pricing;
    
    // Calculate costs based on current token usage
    // For now, assume all tokens are non-cached (we can enhance this later)
    const inputTextCost = (this.tokenUsage.inputTextTokens / 1000000) * modelPricing.textInput;
    const inputAudioCost = (this.tokenUsage.inputAudioTokens / 1000000) * modelPricing.audioInput;
    const outputTextCost = (this.tokenUsage.outputTextTokens / 1000000) * modelPricing.textOutput;
    const outputAudioCost = (this.tokenUsage.outputAudioTokens / 1000000) * modelPricing.audioOutput;
    
    this.elements.inputTextCost.textContent = inputTextCost.toFixed(4);
    this.elements.inputAudioCost.textContent = inputAudioCost.toFixed(4);
    this.elements.outputTextCost.textContent = outputTextCost.toFixed(4);
    this.elements.outputAudioCost.textContent = outputAudioCost.toFixed(4);
    
    const totalCost = inputTextCost + inputAudioCost + outputTextCost + outputAudioCost;
    this.elements.totalCost.textContent = totalCost.toFixed(4);
  }

  updatePricingDisplay() {
    // Get current model pricing
    const currentModel = this.sessionData?.model || "gpt-4o-realtime-preview";
    const modelPricing = this.modelPricing[currentModel] || this.pricing;
    
    // Update pricing rates display
    this.elements.priceTextInput.textContent = modelPricing.textInput.toFixed(2);
    this.elements.priceAudioInput.textContent = modelPricing.audioInput.toFixed(2);
    this.elements.priceTextOutput.textContent = modelPricing.textOutput.toFixed(2);
    this.elements.priceAudioOutput.textContent = modelPricing.audioOutput.toFixed(2);
    
    // Update cached pricing rates
    if (this.elements.priceTextInputCached) {
      this.elements.priceTextInputCached.textContent = modelPricing.textInputCached.toFixed(2);
    }
    if (this.elements.priceAudioInputCached) {
      this.elements.priceAudioInputCached.textContent = modelPricing.audioInputCached.toFixed(2);
    }
  }

  addTokenUsage(type, tokens) {
    // Add tokens to the appropriate counter
    if (tokens > 0) {
      switch(type) {
        case 'input_text':
          this.tokenUsage.inputTextTokens += tokens;
          break;
        case 'input_audio':
          this.tokenUsage.inputAudioTokens += tokens;
          break;
        case 'output_text':
          this.tokenUsage.outputTextTokens += tokens;
          break;
        case 'output_audio':
          this.tokenUsage.outputAudioTokens += tokens;
          break;
      }
      this.updateTokenDisplay();
    }
  }

  resetTokenUsage() {
    // Reset all token counters
    this.tokenUsage = {
      inputTextTokens: 0,
      inputAudioTokens: 0,
      outputTextTokens: 0,
      outputAudioTokens: 0
    };
    this.updateTokenDisplay();
  }

  detectVoiceActivity(inputLevel) {
    // Only proceed if voice interruption is enabled
    if (!this.elements.voiceInterruption.checked) {
      return;
    }
    
    // Debug logging every 50 frames (~500ms) to avoid spam
    if (Date.now() - this.lastVoiceActivityCheck > 500) {
      console.log('Voice Activity Debug:', {
        inputLevel: inputLevel.toFixed(4),
        threshold: this.voiceActivityThreshold,
        aboveThreshold: inputLevel > this.voiceActivityThreshold,
        duration: this.voiceActivityDuration,
        isAssistantSpeaking: this.isAssistantSpeaking,
        hasActiveResponse: this.hasActiveResponse,
        interruptionEnabled: this.elements.voiceInterruption.checked
      });
      this.lastVoiceActivityCheck = Date.now();
    }
    
    // Check if user is speaking (input level above threshold)
    if (inputLevel > this.voiceActivityThreshold) {
      this.voiceActivityDuration++;
      
      // If we detect sustained voice activity and there's an active response, interrupt it
      if (this.voiceActivityDuration >= this.voiceActivityCountThreshold && this.hasActiveResponse) {
        this.log('system', '🗣️ User voice detected during AI response - interrupting AI');
        console.log('INTERRUPTING AI:', {
          duration: this.voiceActivityDuration,
          threshold: this.voiceActivityCountThreshold,
          hasActiveResponse: this.hasActiveResponse,
          assistantSpeaking: this.isAssistantSpeaking
        });
        this.sendEvent({
          type: 'response.cancel'
        });
        this.voiceActivityDuration = 0; // Reset to avoid multiple interruptions
      }
    } else {
      // Reset voice activity counter when no voice detected
      this.voiceActivityDuration = Math.max(0, this.voiceActivityDuration - 1);
    }
  }
}

// Initialize the voice agent when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.voiceAgent = new VoiceAgent();
  console.log('OpenAI Realtime Voice Agent initialized');
}); 