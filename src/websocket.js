const io = require('socket.io-client');
const config = require('./config');
const logger = require('./logger');

class WebSocketClient {
  constructor(instanceName, forwarder, instanceConfig) {
    this.instanceName = instanceName;
    this.forwarder = forwarder;
    this.instanceConfig = instanceConfig;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  connect() {
    const socketUrl = `${config.evolution.apiUrl}/${this.instanceName}`;
    
    logger.connection(`Conectando ao WebSocket...`, this.instanceName);
    logger.debug(`URL: ${socketUrl}`, this.instanceName);

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
      path: '/socket.io',
      extraHeaders: {
        'apikey': config.evolution.apiKey
      },
      auth: {
        apikey: config.evolution.apiKey
      },
      query: {
        apikey: config.evolution.apiKey
      }
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      logger.connected(this.instanceName, this.socket.id, this.socket.io.engine.transport.name);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      logger.error(`Erro ao conectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, this.instanceName, error);
    });

    this.socket.on('disconnect', (reason) => {
      logger.disconnected(this.instanceName, reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      logger.connection(`Reconectado após ${attemptNumber} tentativas`, this.instanceName);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      logger.reconnecting(this.instanceName, attemptNumber, this.maxReconnectAttempts);
    });

    this.socket.on('error', (error) => {
      logger.error('Socket Error', this.instanceName, error);
    });

    this.socket.onAny((eventName, ...args) => {
      const ignoredEvents = [
        'connect',
        'disconnect',
        'connect_error',
        'reconnect',
        'reconnect_attempt',
        'error'
      ];

      if (!ignoredEvents.includes(eventName)) {
        this.handleWhatsAppEvent(eventName, args);
      }
    });
  }

  async handleWhatsAppEvent(eventName, args) {
    try {
      const payload = Array.isArray(args) && args.length > 0 ? args[0] : args;
      const eventData = Array.isArray(payload) ? payload[0] : payload;
      const data = eventData.data || eventData;

      await this.forwarder.forwardEvent(eventName, data);

    } catch (error) {
      logger.error(`Erro ao processar ${eventName}`, this.instanceName, error);
    }
  }

  disconnect() {
    if (this.socket) {
      logger.connection('Desconectando...', this.instanceName);
      this.socket.disconnect();
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }
}

module.exports = WebSocketClient;