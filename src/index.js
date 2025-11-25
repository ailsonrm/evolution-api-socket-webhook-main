const express = require('express');
const config = require('./config');
const logger = require('./logger');
const InstanceManager = require('./instance-manager');

const app = express();
app.use(express.json());

const instanceManager = new InstanceManager();

// Health check
app.get('/health', (req, res) => {
  const globalStats = instanceManager.getGlobalStats();
  const instancesStatus = instanceManager.getInstancesStatus();

  res.json({
    status: 'running',
    uptime: process.uptime(),
    instances: instancesStatus,
    globalStats: globalStats,
    logConfig: logger.getConfig()
  });
});

// Estatísticas globais
app.get('/stats', (req, res) => {
  res.json(instanceManager.getGlobalStats());
});

// Estatísticas por instância
app.get('/stats/:instanceName', (req, res) => {
  const stats = instanceManager.getInstanceStats(req.params.instanceName);
  
  if (!stats) {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  res.json(stats);
});

// Todas as estatísticas detalhadas
app.get('/stats/all/detailed', (req, res) => {
  res.json(instanceManager.getAllStats());
});

// Resetar estatísticas
app.post('/stats/reset', (req, res) => {
  instanceManager.resetAllStats();
  logger.info('Estatísticas resetadas via API');
  res.json({ message: 'Estatísticas resetadas com sucesso' });
});

// Configuração
app.get('/config', (req, res) => {
  res.json({
    evolution: {
      apiUrl: config.evolution.apiUrl,
      apiKeyConfigured: !!config.evolution.apiKey
    },
    instances: config.instances.map(i => ({
      name: i.name,
      webhooks: i.webhooks.length,
      globalWebhooks: config.globalWebhooks.length,
      totalWebhooks: i.webhooks.length + config.globalWebhooks.length,
      events: i.events.length > 0 ? i.events : 'all'
    })),
    globalWebhooks: config.globalWebhooks,
    webhookSettings: config.webhooks,
    features: config.features,
    logging: logger.getConfig()
  });
});

// Status das instâncias
app.get('/instances', (req, res) => {
  res.json(instanceManager.getInstancesStatus());
});

// Atualizar configuração de logs em tempo real
app.post('/logs/config', (req, res) => {
  const newConfig = req.body;
  logger.updateConfig(newConfig);
  logger.info('Configuração de logs atualizada via API');
  res.json({ 
    message: 'Configuração atualizada com sucesso',
    config: logger.getConfig()
  });
});

// Inicia o servidor
app.listen(config.server.port, () => {
  logger.header('🚀 Servidor HTTP iniciado');
  logger.info(`Porta: ${config.server.port}`);
  logger.info(`Health: http://localhost:${config.server.port}/health`);
  logger.info(`Stats: http://localhost:${config.server.port}/stats`);
  logger.info(`Config: http://localhost:${config.server.port}/config`);
  logger.separator();
});

// Inicializa as instâncias
instanceManager.initialize();

// Mostra estatísticas periódicas
if (config.logging.statsInterval > 0) {
  setInterval(() => {
    const globalStats = instanceManager.getGlobalStats();
    const allStats = instanceManager.getAllStats();

    logger.stats(globalStats, true);
    
    logger.info('📱 Por instância:');
    Object.entries(allStats).forEach(([name, stats]) => {
      logger.info(`   ${name}: ${stats.totalEvents} eventos | ${stats.successRate} sucesso`);
    });
    logger.separator();

  }, config.logging.statsInterval * 60 * 1000);
}

// Tratamento de encerramento
process.on('SIGINT', () => {
  logger.header('🛑 Encerrando aplicação...');
  
  const globalStats = instanceManager.getGlobalStats();
  logger.stats(globalStats, true);
  
  instanceManager.disconnectAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 Recebido SIGTERM, encerrando...');
  instanceManager.disconnectAll();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Erro não capturado', null, error);
  instanceManager.disconnectAll();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Promise rejeitada', null, reason);
});

logger.header('🎯 Evolution WebSocket Forwarder Multi-Instância');
logger.info(`Nível de log: ${logger.getConfig().level}`);
logger.separator();