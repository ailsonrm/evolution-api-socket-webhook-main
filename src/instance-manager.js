const WebSocketClient = require('./websocket');
const EventForwarder = require('./forwarder');
const config = require('./config');
const logger = require('./logger');

class InstanceManager {
  constructor() {
    this.instances = new Map();
    this.forwarders = new Map();
  }

  initialize() {
    logger.header('🚀 Inicializando gerenciador de instâncias...');

    config.instances.forEach(instanceConfig => {
      this.addInstance(instanceConfig);
    });

    logger.info(`✅ ${this.instances.size} instância(s) iniciada(s) com sucesso!`);
    logger.separator();
  }

  addInstance(instanceConfig) {
    const { name, webhooks, events } = instanceConfig;

    logger.info(`📱 Configurando instância: ${name}`);
    logger.debug(`   Webhooks próprios: ${webhooks.length}`);
    logger.debug(`   Webhooks globais: ${config.globalWebhooks.length}`);
    logger.debug(`   Total: ${webhooks.length + config.globalWebhooks.length}`);
    
    if (events.length > 0) {
      logger.debug(`   Eventos filtrados: ${events.join(', ')}`);
    }

    const forwarder = new EventForwarder(name, instanceConfig);
    this.forwarders.set(name, forwarder);

    const wsClient = new WebSocketClient(name, forwarder, instanceConfig);
    this.instances.set(name, wsClient);

    wsClient.connect();
  }

  getInstanceStats(instanceName) {
    const forwarder = this.forwarders.get(instanceName);
    if (!forwarder) return null;
    return forwarder.getStats();
  }

  getAllStats() {
    const stats = {};
    this.forwarders.forEach((forwarder, name) => {
      stats[name] = forwarder.getStats();
    });
    return stats;
  }

  getGlobalStats() {
    let totalEvents = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    const byEventType = {};

    this.forwarders.forEach((forwarder) => {
      const stats = forwarder.getStats();
      totalEvents += stats.totalEvents;
      totalSuccessful += stats.successfulForwards;
      totalFailed += stats.failedForwards;

      Object.entries(stats.byEventType).forEach(([event, count]) => {
        byEventType[event] = (byEventType[event] || 0) + count;
      });
    });

    return {
      totalInstances: this.instances.size,
      totalEvents,
      successfulForwards: totalSuccessful,
      failedForwards: totalFailed,
      successRate: totalEvents > 0
        ? ((totalSuccessful / totalEvents) * 100).toFixed(2) + '%'
        : '0%',
      byEventType
    };
  }

  getInstancesStatus() {
    const status = {};
    this.instances.forEach((wsClient, name) => {
      status[name] = {
        connected: wsClient.isConnected(),
        socketId: wsClient.socket?.id,
        reconnectAttempts: wsClient.reconnectAttempts
      };
    });
    return status;
  }

  disconnectAll() {
    logger.info('🛑 Desconectando todas as instâncias...');
    this.instances.forEach((wsClient, name) => {
      wsClient.disconnect();
    });
    logger.info('✅ Todas as instâncias desconectadas');
  }

  resetAllStats() {
    this.forwarders.forEach(forwarder => {
      forwarder.resetStats();
    });
  }
}

module.exports = InstanceManager;