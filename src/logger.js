const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.config = {
      level: process.env.LOG_LEVEL || 'info',
      connection: process.env.LOG_CONNECTION !== 'false',
      events: process.env.LOG_EVENTS !== 'false',
      forwards: process.env.LOG_FORWARDS !== 'false',
      errors: process.env.LOG_ERRORS !== 'false',
      stats: process.env.LOG_STATS !== 'false',
      retry: process.env.LOG_RETRY !== 'false',
      payload: process.env.LOG_PAYLOAD === 'true',
      colors: process.env.LOG_COLORS !== 'false',
      timestamp: process.env.LOG_TIMESTAMP !== 'false',
      instanceName: process.env.LOG_INSTANCE_NAME !== 'false',
      toFile: process.env.LOG_TO_FILE === 'true',
      filePath: process.env.LOG_FILE_PATH || './logs/app.log',
      fileMaxSize: parseInt(process.env.LOG_FILE_MAX_SIZE || '10485760'),
      fileRotate: process.env.LOG_FILE_ROTATE !== 'false'
    };

    this.levels = {
      silent: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
      verbose: 5
    };

    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m'
    };

    // Cria diretório de logs se necessário
    if (this.config.toFile) {
      this.ensureLogDirectory();
    }

    // Sobrescreve console.log, console.error, etc se o nível for silent
    if (this.config.level === 'silent') {
      this.overrideConsole();
    }
  }

  ensureLogDirectory() {
    const dir = path.dirname(this.config.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  overrideConsole() {
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.debug = () => {};
  }

  shouldLog(level) {
    return this.levels[this.config.level] >= this.levels[level];
  }

  formatTimestamp() {
    if (!this.config.timestamp) return '';
    const now = new Date();
    return `[${now.toLocaleString('pt-BR')}]`;
  }

  formatInstance(instanceName) {
    if (!this.config.instanceName || !instanceName) return '';
    return `[${instanceName}]`;
  }

  colorize(text, color) {
    if (!this.config.colors) return text;
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  writeToFile(message) {
    if (!this.config.toFile) return;

    try {
      // Verifica tamanho do arquivo e rotaciona se necessário
      if (this.config.fileRotate && fs.existsSync(this.config.filePath)) {
        const stats = fs.statSync(this.config.filePath);
        if (stats.size >= this.config.fileMaxSize) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedPath = this.config.filePath.replace('.log', `-${timestamp}.log`);
          fs.renameSync(this.config.filePath, rotatedPath);
        }
      }

      // Remove cores do texto para o arquivo
      const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
      fs.appendFileSync(this.config.filePath, cleanMessage + '\n');
    } catch (error) {
      // Não faz nada se falhar ao escrever no arquivo
    }
  }

  log(level, type, message, instanceName = null, data = null) {
    if (!this.shouldLog(level)) return;

    // Verifica se o tipo de log está habilitado
    if (type && !this.config[type]) return;

    const timestamp = this.formatTimestamp();
    const instance = this.formatInstance(instanceName);
    
    let fullMessage = `${timestamp} ${instance} ${message}`.trim();

    // Adiciona cor baseado no level
    let coloredMessage = fullMessage;
    switch (level) {
      case 'error':
        coloredMessage = this.colorize(fullMessage, 'red');
        break;
      case 'warn':
        coloredMessage = this.colorize(fullMessage, 'yellow');
        break;
      case 'info':
        coloredMessage = this.colorize(fullMessage, 'cyan');
        break;
      case 'debug':
        coloredMessage = this.colorize(fullMessage, 'gray');
        break;
      case 'verbose':
        coloredMessage = this.colorize(fullMessage, 'magenta');
        break;
    }

    // Exibe no console
    console.log(coloredMessage);

    // Mostra payload se habilitado e se está no nível verbose
    if (data && this.config.payload && this.shouldLog('verbose')) {
      console.log(this.colorize(JSON.stringify(data, null, 2), 'gray'));
    }

    // Salva em arquivo
    this.writeToFile(fullMessage);
    if (data && this.config.payload) {
      this.writeToFile(JSON.stringify(data, null, 2));
    }
  }

  // Métodos específicos para cada tipo de log

  connection(message, instanceName = null) {
    this.log('info', 'connection', `🔌 ${message}`, instanceName);
  }

  connected(instanceName, socketId, transport) {
    if (!this.config.connection) return;
    this.log('info', 'connection', `✅ CONECTADO! Socket: ${socketId} | Transport: ${transport}`, instanceName);
  }

  disconnected(instanceName, reason) {
    if (!this.config.connection) return;
    this.log('warn', 'connection', `⚠️  DESCONECTADO - Motivo: ${reason}`, instanceName);
  }

  reconnecting(instanceName, attempt, maxAttempts) {
    if (!this.config.connection) return;
    this.log('info', 'connection', `🔄 Reconectando... (${attempt}/${maxAttempts})`, instanceName);
  }

  event(eventName, instanceName, data = null) {
    if (!this.config.events) return;
    this.log('info', 'events', `📨 Evento: ${eventName}`, instanceName, data);
  }

  forward(eventName, url, duration, instanceName) {
    if (!this.config.forwards) return;
    const shortUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    this.log('info', 'forwards', `✅ ${eventName} → ${shortUrl} (${duration}ms)`, instanceName);
  }

  forwardError(eventName, url, error, instanceName) {
    if (!this.config.forwards) return;
    const shortUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    this.log('error', 'forwards', `❌ ${eventName} → ${shortUrl} - Erro: ${error}`, instanceName);
  }

  retry(instanceName, attempt, maxAttempts, url) {
    if (!this.config.retry) return;
    const shortUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    this.log('warn', 'retry', `⚠️  Tentativa ${attempt}/${maxAttempts} - ${shortUrl}`, instanceName);
  }

  error(message, instanceName = null, error = null) {
    if (!this.config.errors) return;
    this.log('error', 'errors', `❌ ${message}`, instanceName, error);
  }

  stats(stats, detailed = false) {
    if (!this.config.stats) return;

    this.log('info', 'stats', '📊 ==================== ESTATÍSTICAS ====================');
    
    if (stats.totalInstances !== undefined) {
      // Estatísticas globais
      this.log('info', 'stats', `📱 Instâncias: ${stats.totalInstances}`);
      this.log('info', 'stats', `📨 Total de eventos: ${stats.totalEvents}`);
      this.log('info', 'stats', `✅ Sucesso: ${stats.successfulForwards} | ❌ Falhas: ${stats.failedForwards}`);
      this.log('info', 'stats', `📈 Taxa de sucesso: ${stats.successRate}`);

      if (detailed && stats.byEventType) {
        this.log('info', 'stats', '\n📋 Por tipo de evento:');
        Object.entries(stats.byEventType).forEach(([event, count]) => {
          this.log('info', 'stats', `   ${event}: ${count}`);
        });
      }
    } else {
      // Estatísticas de uma instância específica
      this.log('info', 'stats', `📨 Eventos: ${stats.totalEvents}`);
      this.log('info', 'stats', `✅ Sucesso: ${stats.successfulForwards} | ❌ Falhas: ${stats.failedForwards}`);
      this.log('info', 'stats', `📈 Taxa: ${stats.successRate}`);
    }

    this.log('info', 'stats', '=========================================================');
  }

  info(message, instanceName = null) {
    this.log('info', null, message, instanceName);
  }

  warn(message, instanceName = null) {
    this.log('warn', null, message, instanceName);
  }

  debug(message, instanceName = null, data = null) {
    this.log('debug', null, message, instanceName, data);
  }

  verbose(message, instanceName = null, data = null) {
    this.log('verbose', null, message, instanceName, data);
  }

  separator() {
    if (this.shouldLog('info')) {
      console.log(this.colorize('-----------------------------------', 'gray'));
    }
  }

  header(message) {
    if (this.shouldLog('info')) {
      console.log('\n' + this.colorize(message, 'bright'));
      this.separator();
    }
  }

  getConfig() {
    return this.config;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = new Logger();