const {
  getConfig,
  createLogger,
  connectMqtt,
  setupAutoDiscovery,
  publishStatus,
  publishIPs,
  publishLastUpdate,
  publishDomainStatus,
  disconnectMqtt,
  HomeAssistantAPI,
} = require("./utils");

const {
  checkIPChanges,
  updateAllDNSRecords,
  createAzureDNSClient,
  createDNSUpdateCalendarEvent,
} = require("./functions");

class AzureDDNS {
  constructor() {
    this.config = getConfig();
    this.logger = createLogger(this.config.log_level);
    this.currentIPv4 = null;
    this.currentIPv6 = null;
    this.lastUpdateTime = null;
    this.mqttClient = null;
    this.dnsClient = null;
    this.updateTimer = null;
    this.haAPI = null;

    this.initializeClients();
    this.startService();
  }

  initializeClients() {
    // Initialize Azure DNS client
    this.dnsClient = createAzureDNSClient(this.config);

    // Initialize MQTT client
    this.mqttClient = connectMqtt(this.config, this.logger);
    this.mqttClient.on("connect", () => {
      setupAutoDiscovery(this.config, this.logger);
    });

    // Initialize Home Assistant API for calendar integration
    if (this.config.calendar_entity) {
      this.haAPI = new HomeAssistantAPI(this.logger);
      this.logger.info(
        `Calendar integration enabled: ${this.config.calendar_entity}`
      );
    }
  }

  async startService() {
    this.logger.info("Azure Dynamic DNS service starting...");

    // Initial IP check
    await this.checkAndUpdateIP();

    // Schedule periodic checks
    const interval = this.config.check_interval * 1000;
    this.updateTimer = setInterval(() => {
      this.checkAndUpdateIP();
    }, interval);

    this.logger.info(
      `Service started, checking IP every ${this.config.check_interval} seconds`
    );
  }

  async checkAndUpdateIP() {
    try {
      const { newIPv4, newIPv6, ipv4Changed, ipv6Changed } =
        await checkIPChanges(
          this.currentIPv4,
          this.currentIPv6,
          this.config,
          this.logger
        );

      // Store previous IPs for MQTT publishing
      const previousIPv4 = this.currentIPv4;
      const previousIPv6 = this.currentIPv6;

      // Update current IPs
      if (newIPv4) this.currentIPv4 = newIPv4;
      if (newIPv6) this.currentIPv6 = newIPv6;

      // Publish current IPs to MQTT
      publishIPs(
        newIPv4,
        newIPv6,
        ipv4Changed,
        ipv6Changed,
        previousIPv4,
        previousIPv6,
        this.logger
      );

      // Update DNS records if any IP changed
      if (ipv4Changed || ipv6Changed) {
        await this.updateDNSRecords(newIPv4, newIPv6);
        this.lastUpdateTime = new Date();
        publishLastUpdate(this.lastUpdateTime, this.logger);
      }
    } catch (error) {
      this.logger.error(`Failed to check/update IP: ${error.message}`);
      publishStatus("error", this.logger, error.message);
    }
  }

  async updateDNSRecords(ipv4, ipv6) {
    try {
      const updatedRecords = await updateAllDNSRecords(
        this.dnsClient,
        ipv4,
        ipv6,
        this.config,
        this.logger
      );

      // Update domain status for each domain
      for (const domain of this.config.domains) {
        publishDomainStatus(domain.zone, "updated", this.logger);
      }

      // Create calendar event if updates were successful and calendar is configured
      if (
        updatedRecords.length > 0 &&
        this.haAPI &&
        this.config.calendar_entity
      ) {
        await createDNSUpdateCalendarEvent(
          this.haAPI,
          updatedRecords,
          ipv4,
          ipv6,
          this.config.calendar_entity,
          this.logger
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update DNS records: ${error.message}`);

      // Update domain status for each domain to error
      for (const domain of this.config.domains) {
        publishDomainStatus(domain.zone, "error", this.logger, error.message);
      }

      throw error;
    }
  }

  shutdown() {
    this.logger.info("Shutting down Azure Dynamic DNS service...");

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    disconnectMqtt(this.logger);
  }
}

// Handle shutdown signals
process.on("SIGTERM", () => {
  if (global.ddnsService) {
    global.ddnsService.shutdown();
  }
  process.exit(0);
});

process.on("SIGINT", () => {
  if (global.ddnsService) {
    global.ddnsService.shutdown();
  }
  process.exit(0);
});

// Start the service
try {
  global.ddnsService = new AzureDDNS();
} catch (error) {
  console.error(`Failed to start Azure Dynamic DNS service: ${error.message}`);
  process.exit(1);
}
