require('dotenv').config();
const logger = require('./logger');

class Config {
  constructor() {
    this.evolution = {
      apiUrl: process.env.EVOLUTION_API_URL || 'https://evo-api.pro',
      apiKey: process.env.EVOLUTION_API_KEY
    };

    this.instances = this.loadInstances();
    this.globalWebhooks = this.loadGlobalWebhooks();
    
    this.webhooks = {
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.RETRY_DELAY || '1000'),
      timeout: parseInt(process.env.TIMEOUT || '10000')
    };

    this.server = {
      port: parseInt(process.env.PORT || '3000')
    };

    this.logging = {
      statsInterval: parseInt(process.env.LOG_STATS_INTERVAL || '5')
    };

    this.features = {
      addInstancePrefix: process.env.ADD_INSTANCE_PREFIX === 'true'
    };

    this.validate();
  }

  loadInstances() {
    const instances = [];
    let instanceNumber = 1;

    while (true) {
      const nameKey = `INSTANCE_${instanceNumber}_NAME`;
      const webhooksKey = `INSTANCE_${instanceNumber}_WEBHOOKS`;
      const eventsKey = `INSTANCE_${instanceNumber}_EVENTS`;

      const name = process.env[nameKey];
      const webhooks = process.env[webhooksKey];

      if (!name || !webhooks) {
        break;
      }

      instances.push({
        number: instanceNumber,
        name: name.trim(),
        webhooks: webhooks.split(',').map(url => url.trim()).filter(url => url),
        events: process.env[eventsKey]
          ? process.env[eventsKey].split(',').map(e => e.trim()).filter(e => e)
          : []
      });

      instanceNumber++;
    }

    return instances;
  }

  loadGlobalWebhooks() {
    if (!process.env.GLOBAL_WEBHOOKS) {
      return [];
    }

    return process.env.GLOBAL_WEBHOOKS
      .split(',')
      .map(url => url.trim())
      .filter(url => url);
  }

  validate() {
    if (!this.evolution.apiKey) {
      logger.error('EVOLUTION_API_KEY não configurada no .env');
      process.exit(1);
    }

    if (this.instances.length === 0) {
      logger.error('Nenhuma instância configurada no .env');
      logger.info('💡 Configure pelo menos INSTANCE_1_NAME e INSTANCE_1_WEBHOOKS');
      process.exit(1);
    }

    this.instances.forEach(instance => {
      if (instance.webhooks.length === 0 && this.globalWebhooks.length === 0) {
        logger.error(`Instância "${instance.name}" sem webhooks`);
        process.exit(1);
      }
    });

    logger.info(`✅ ${this.instances.length} instância(s) configurada(s)`);
    this.instances.forEach(instance => {
      const totalWebhooks = instance.webhooks.length + this.globalWebhooks.length;
      logger.info(`   - ${instance.name}: ${totalWebhooks} webhook(s)`);
    });

    if (this.globalWebhooks.length > 0) {
      logger.info(`✅ ${this.globalWebhooks.length} webhook(s) global(is)`);
    }
  }

  getAllWebhooksForInstance(instanceName) {
    const instance = this.instances.find(i => i.name === instanceName);
    if (!instance) return [];
    return [...instance.webhooks, ...this.globalWebhooks];
  }

  getEnabledEventsForInstance(instanceName) {
    const instance = this.instances.find(i => i.name === instanceName);
    if (!instance) return [];
    return instance.events;
  }
}

module.exports = new Config();