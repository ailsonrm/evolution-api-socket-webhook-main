const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

class EventForwarder {
  constructor(instanceName, instanceConfig) {
    this.instanceName = instanceName;
    this.instanceConfig = instanceConfig;
    this.stats = {
      totalEvents: 0,
      successfulForwards: 0,
      failedForwards: 0,
      byEventType: {}
    };
  }

  async forwardEvent(eventName, eventData) {
    this.stats.totalEvents++;
    
    if (!this.stats.byEventType[eventName]) {
      this.stats.byEventType[eventName] = 0;
    }
    this.stats.byEventType[eventName]++;

    const enabledEvents = this.instanceConfig.events;
    if (enabledEvents.length > 0 && !enabledEvents.includes(eventName)) {
      logger.debug(`Evento ${eventName} filtrado`, this.instanceName);
      return;
    }

    logger.event(eventName, this.instanceName, eventData);

    const payload = {
      event: eventName,
      instance: this.instanceName,
      timestamp: new Date().toISOString(),
      data: eventData
    };

    if (config.features.addInstancePrefix) {
      payload.source = `evolution-${this.instanceName}`;
    }

    const webhookUrls = config.getAllWebhooksForInstance(this.instanceName);
    const promises = webhookUrls.map(url => 
      this.sendToWebhook(url, payload, eventName)
    );

    await Promise.allSettled(promises);
  }

  async sendToWebhook(url, payload, eventName, attempt = 1) {
    try {
      const startTime = Date.now();
      
      const response = await axios.post(url, payload, {
        timeout: config.webhooks.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Evolution-WebSocket-Forwarder/2.0',
          'X-Event-Name': eventName,
          'X-Instance-Name': this.instanceName
        }
      });

      const duration = Date.now() - startTime;
      this.stats.successfulForwards++;

      logger.forward(eventName, url, duration, this.instanceName);

      return { success: true, url, duration };

    } catch (error) {
      const shouldRetry = attempt < config.webhooks.retryAttempts;

      if (shouldRetry) {
        logger.retry(this.instanceName, attempt, config.webhooks.retryAttempts, url);
        
        await new Promise(resolve => setTimeout(resolve, config.webhooks.retryDelay));
        return this.sendToWebhook(url, payload, eventName, attempt + 1);
      }

      this.stats.failedForwards++;
      logger.forwardError(eventName, url, error.message, this.instanceName);

      return { success: false, url, error: error.message };
    }
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalEvents > 0 
        ? ((this.stats.successfulForwards / this.stats.totalEvents) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  resetStats() {
    this.stats = {
      totalEvents: 0,
      successfulForwards: 0,
      failedForwards: 0,
      byEventType: {}
    };
  }
}

module.exports = EventForwarder;