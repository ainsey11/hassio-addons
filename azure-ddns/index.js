const fs = require("fs");
const axios = require("axios");
const mqtt = require("mqtt");
const { DnsManagementClient } = require("@azure/arm-dns");
const { ClientSecretCredential } = require("@azure/identity");

class HomeAssistantAPI {
  constructor(logger) {
    this.baseURL = process.env.HASSIO_TOKEN
      ? "http://supervisor/core"
      : "http://homeassistant:8123";
    this.token = process.env.HASSIO_TOKEN;
    this.logger = logger;
  }

  async createCalendarEvent(entityId, event) {
    if (!this.token) {
      this.logger.error(
        "No Home Assistant token available for calendar integration"
      );
      return false;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/api/services/calendar/create_event`,
        {
          entity_id: entityId,
          ...event,
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Failed to create calendar event: ${error.message}`);
      return false;
    }
  }
}

class AzureDDNS {
  constructor() {
    this.config = this.loadConfig();
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

  loadConfig() {
    const configPath = "/data/options.json";
    if (!fs.existsSync(configPath)) {
      throw new Error("Configuration file not found");
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    // Validate required configuration
    const required = [
      "azure_tenant_id",
      "azure_client_id",
      "azure_client_secret",
      "azure_subscription_id",
      "azure_resource_group",
    ];
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }

    if (!config.domains || config.domains.length === 0) {
      throw new Error("No domains configured for DNS updates");
    }

    return config;
  }

  initializeClients() {
    // Initialize Azure DNS client
    const credential = new ClientSecretCredential(
      this.config.azure_tenant_id,
      this.config.azure_client_id,
      this.config.azure_client_secret
    );

    this.dnsClient = new DnsManagementClient(
      credential,
      this.config.azure_subscription_id
    );

    // Initialize MQTT client
    const mqttUrl = `mqtt://${this.config.mqtt_host}:${this.config.mqtt_port}`;
    const mqttOptions = {
      username: this.config.mqtt_user || undefined,
      password: this.config.mqtt_password || undefined,
    };

    this.mqttClient = mqtt.connect(mqttUrl, mqttOptions);

    this.mqttClient.on("connect", () => {
      this.log("info", "MQTT connected");
      this.setupAutoDiscovery();
      this.publishStatus("online");
    });

    this.mqttClient.on("error", (error) => {
      this.log("error", `MQTT error: ${error.message}`);
    });

    // Initialize Home Assistant API for calendar integration
    if (this.config.calendar_entity) {
      this.haAPI = new HomeAssistantAPI((level, message) =>
        this.log(level, message)
      );
      this.log(
        "info",
        `Calendar integration enabled: ${this.config.calendar_entity}`
      );
    }
  }

  async startService() {
    this.log("info", "Azure Dynamic DNS service starting...");

    // Initial IP check
    await this.checkAndUpdateIP();

    // Schedule periodic checks
    const interval = (this.config.check_interval || 300) * 1000;
    this.updateTimer = setInterval(() => {
      this.checkAndUpdateIP();
    }, interval);

    this.log(
      "info",
      `Service started, checking IP every ${
        this.config.check_interval || 300
      } seconds`
    );
  }

  async getCurrentPublicIP(ipVersion = 4) {
    const services =
      ipVersion === 6
        ? this.config.ipv6_services || [
            "https://api64.ipify.org",
            "https://ipv6.icanhazip.com",
          ]
        : this.config.ip_services || [
            "https://api.ipify.org",
            "https://icanhazip.com",
          ];

    for (const service of services) {
      try {
        this.log("debug", `Checking IPv${ipVersion} from ${service}`);
        const response = await axios.get(service, { timeout: 10000 });
        const ip = response.data.trim();

        // IP validation
        const isValidIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
        const isValidIPv6 =
          /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/.test(
            ip
          );

        if (
          (ipVersion === 4 && isValidIPv4) ||
          (ipVersion === 6 && isValidIPv6)
        ) {
          this.log("debug", `Got IPv${ipVersion} ${ip} from ${service}`);
          return ip;
        }
      } catch (error) {
        this.log(
          "warning",
          `Failed to get IPv${ipVersion} from ${service}: ${error.message}`
        );
      }
    }

    throw new Error(
      `Unable to determine public IPv${ipVersion} from any service`
    );
  }

  async checkAndUpdateIP() {
    try {
      let ipv4Changed = false;
      let ipv6Changed = false;
      let newIPv4 = null;
      let newIPv6 = null;

      // Check IPv4 if enabled
      if (this.config.ipv4_enabled !== false) {
        try {
          newIPv4 = await this.getCurrentPublicIP(4);
          if (this.currentIPv4 !== newIPv4) {
            const previousIPv4 = this.currentIPv4;
            this.currentIPv4 = newIPv4;
            ipv4Changed = true;
            this.log(
              "info",
              `IPv4 changed from ${previousIPv4 || "unknown"} to ${newIPv4}`
            );
          } else {
            this.log("debug", `IPv4 unchanged: ${newIPv4}`);
          }
        } catch (error) {
          this.log("warning", `Failed to check IPv4: ${error.message}`);
        }
      }

      // Check IPv6 if enabled
      if (this.config.ipv6_enabled === true) {
        try {
          newIPv6 = await this.getCurrentPublicIP(6);
          if (this.currentIPv6 !== newIPv6) {
            const previousIPv6 = this.currentIPv6;
            this.currentIPv6 = newIPv6;
            ipv6Changed = true;
            this.log(
              "info",
              `IPv6 changed from ${previousIPv6 || "unknown"} to ${newIPv6}`
            );
          } else {
            this.log("debug", `IPv6 unchanged: ${newIPv6}`);
          }
        } catch (error) {
          this.log("warning", `Failed to check IPv6: ${error.message}`);
        }
      }

      // Publish current IPs
      this.publishIPs(newIPv4, newIPv6, ipv4Changed, ipv6Changed);

      // Update DNS records if any IP changed
      if (ipv4Changed || ipv6Changed) {
        await this.updateDNSRecords(newIPv4, newIPv6);
        this.lastUpdateTime = new Date();
        this.publishLastUpdate();
      }
    } catch (error) {
      this.log("error", `Failed to check/update IP: ${error.message}`);
      this.publishStatus("error", error.message);
    }
  }

  async updateDNSRecords(ipv4, ipv6) {
    const updatedRecords = [];

    for (const domain of this.config.domains) {
      try {
        const domainUpdates = await this.updateDomainRecords(
          domain,
          ipv4,
          ipv6
        );
        updatedRecords.push(...domainUpdates);
        this.publishDomainStatus(domain.zone, "updated");
      } catch (error) {
        this.log(
          "error",
          `Failed to update domain ${domain.zone}: ${error.message}`
        );
        this.publishDomainStatus(domain.zone, "error", error.message);
      }
    }

    // Create calendar event if updates were successful and calendar is configured
    if (
      updatedRecords.length > 0 &&
      this.haAPI &&
      this.config.calendar_entity
    ) {
      await this.createCalendarEvent(updatedRecords, ipv4, ipv6);
    }
  }

  async updateDomainRecords(domain, ipv4, ipv6) {
    const { zone, records } = domain;
    const updatedRecords = [];

    for (const recordName of records) {
      // Update A record (IPv4) if IPv4 is available and enabled
      if (ipv4 && this.config.ipv4_enabled !== false) {
        try {
          this.log(
            "info",
            `Updating A record ${recordName}.${zone} to ${ipv4}`
          );

          const recordSet = {
            ttl: 300,
            aRecords: [{ ipv4Address: ipv4 }],
          };

          await this.dnsClient.recordSets.createOrUpdate(
            this.config.azure_resource_group,
            zone,
            recordName === "@" ? "@" : recordName,
            "A",
            recordSet
          );

          updatedRecords.push({
            record: `${recordName}.${zone}`,
            type: "A",
            value: ipv4,
          });

          this.log(
            "info",
            `Successfully updated A record ${recordName}.${zone}`
          );
        } catch (error) {
          this.log(
            "error",
            `Failed to update A record ${recordName}.${zone}: ${error.message}`
          );
          throw error;
        }
      }

      // Update AAAA record (IPv6) if IPv6 is available and enabled
      if (ipv6 && this.config.ipv6_enabled === true) {
        try {
          this.log(
            "info",
            `Updating AAAA record ${recordName}.${zone} to ${ipv6}`
          );

          const recordSet = {
            ttl: 300,
            aaaaRecords: [{ ipv6Address: ipv6 }],
          };

          await this.dnsClient.recordSets.createOrUpdate(
            this.config.azure_resource_group,
            zone,
            recordName === "@" ? "@" : recordName,
            "AAAA",
            recordSet
          );

          updatedRecords.push({
            record: `${recordName}.${zone}`,
            type: "AAAA",
            value: ipv6,
          });

          this.log(
            "info",
            `Successfully updated AAAA record ${recordName}.${zone}`
          );
        } catch (error) {
          this.log(
            "error",
            `Failed to update AAAA record ${recordName}.${zone}: ${error.message}`
          );
          throw error;
        }
      }
    }

    return updatedRecords;
  }

  async createCalendarEvent(updatedRecords, ipv4, ipv6) {
    try {
      const now = new Date();
      const eventTitle = "DNS Records Updated";

      // Create summary of what was updated
      const recordSummary = updatedRecords
        .map((record) => `${record.record} (${record.type}) → ${record.value}`)
        .join("\n");

      const description = `Azure Dynamic DNS updated the following records:\n\n${recordSummary}\n\nTimestamp: ${now.toISOString()}`;

      const event = {
        summary: eventTitle,
        description: description,
        start_date_time: now.toISOString(),
        end_date_time: new Date(now.getTime() + 15 * 60 * 1000).toISOString(), // 15 minute duration
      };

      const success = await this.haAPI.createCalendarEvent(
        this.config.calendar_entity,
        event
      );

      if (success) {
        this.log(
          "info",
          `Created calendar event for DNS update: ${updatedRecords.length} records updated`
        );
      } else {
        this.log("warning", "Failed to create calendar event for DNS update");
      }
    } catch (error) {
      this.log("error", `Error creating calendar event: ${error.message}`);
    }
  }

  setupAutoDiscovery() {
    this.log("info", "Setting up MQTT Auto Discovery...");

    // Device info for grouping all sensors
    const deviceInfo = {
      identifiers: ["azure_ddns"],
      name: "Azure Dynamic DNS",
      manufacturer: "Home Assistant Addon",
      model: "Azure DDNS Service",
      sw_version: "1.0.0",
    };

    // DDNS Service Status (binary sensor)
    this.publishAutoDiscovery("binary_sensor", "azure_ddns_service", {
      name: "Azure DDNS Service",
      state_topic: "ddns/azure/status",
      value_template: "{{ 'ON' if value_json.status == 'online' else 'OFF' }}",
      json_attributes_topic: "ddns/azure/status",
      device_class: "connectivity",
      device: deviceInfo,
      unique_id: "azure_ddns_service_status",
    });

    // IPv4 Address sensor
    this.publishAutoDiscovery("sensor", "azure_ddns_ipv4", {
      name: "Public IPv4 Address",
      state_topic: "ddns/azure/ipv4/current",
      icon: "mdi:ip-network",
      device: deviceInfo,
      unique_id: "azure_ddns_ipv4_current",
    });

    // IPv4 Previous Address sensor
    this.publishAutoDiscovery("sensor", "azure_ddns_ipv4_previous", {
      name: "Previous IPv4 Address",
      state_topic: "ddns/azure/ipv4/previous",
      icon: "mdi:ip-network-outline",
      device: deviceInfo,
      unique_id: "azure_ddns_ipv4_previous",
    });

    // IPv6 Address sensor (if enabled)
    if (this.config.ipv6_enabled) {
      this.publishAutoDiscovery("sensor", "azure_ddns_ipv6", {
        name: "Public IPv6 Address",
        state_topic: "ddns/azure/ipv6/current",
        icon: "mdi:ip-network",
        device: deviceInfo,
        unique_id: "azure_ddns_ipv6_current",
      });

      this.publishAutoDiscovery("sensor", "azure_ddns_ipv6_previous", {
        name: "Previous IPv6 Address",
        state_topic: "ddns/azure/ipv6/previous",
        icon: "mdi:ip-network-outline",
        device: deviceInfo,
        unique_id: "azure_ddns_ipv6_previous",
      });
    }

    // Last Update timestamp sensor
    this.publishAutoDiscovery("sensor", "azure_ddns_last_update", {
      name: "Last DNS Update",
      state_topic: "ddns/azure/last_update",
      device_class: "timestamp",
      icon: "mdi:clock-outline",
      device: deviceInfo,
      unique_id: "azure_ddns_last_update",
    });

    // Legacy IPv4 sensor for backward compatibility
    this.publishAutoDiscovery("sensor", "azure_ddns_legacy_ip", {
      name: "Public IP Address (Legacy)",
      state_topic: "ddns/azure/ip/current",
      icon: "mdi:ip-network",
      device: deviceInfo,
      unique_id: "azure_ddns_legacy_ip_current",
    });

    // Create sensors for each domain
    this.config.domains.forEach((domain) => {
      const zoneName = domain.zone.replace(/\./g, "_");
      this.publishAutoDiscovery("sensor", `azure_ddns_domain_${zoneName}`, {
        name: `${domain.zone} DNS Status`,
        state_topic: `ddns/azure/domains/${zoneName}/status`,
        value_template: "{{ value_json.status }}",
        json_attributes_topic: `ddns/azure/domains/${zoneName}/status`,
        icon: "mdi:dns",
        device: deviceInfo,
        unique_id: `azure_ddns_domain_${zoneName}_status`,
      });
    });

    this.log("info", "MQTT Auto Discovery setup complete");
  }

  publishAutoDiscovery(component, objectId, config) {
    const topic = `homeassistant/${component}/azure_ddns/${objectId}/config`;
    const payload = JSON.stringify(config);
    this.mqttClient.publish(topic, payload, { retain: true });
    this.log(
      "debug",
      `Published auto-discovery for ${component}.azure_ddns_${objectId}`
    );
  }

  publishStatus(status, message = "") {
    const topic = "ddns/azure/status";
    const payload = JSON.stringify({
      status,
      message,
      timestamp: new Date().toISOString(),
    });
    this.mqttClient.publish(topic, payload, { retain: true });
  }

  publishIPs(ipv4, ipv6, ipv4Changed, ipv6Changed) {
    // Publish current IPs
    if (ipv4) {
      this.mqttClient.publish("ddns/azure/ipv4/current", ipv4, {
        retain: true,
      });
      if (ipv4Changed && this.currentIPv4) {
        this.mqttClient.publish("ddns/azure/ipv4/previous", this.currentIPv4, {
          retain: true,
        });
      }
    }

    if (ipv6) {
      this.mqttClient.publish("ddns/azure/ipv6/current", ipv6, {
        retain: true,
      });
      if (ipv6Changed && this.currentIPv6) {
        this.mqttClient.publish("ddns/azure/ipv6/previous", this.currentIPv6, {
          retain: true,
        });
      }
    }

    // Maintain backward compatibility with legacy topic
    if (ipv4) {
      this.mqttClient.publish("ddns/azure/ip/current", ipv4, { retain: true });
      if (ipv4Changed && this.currentIPv4) {
        this.mqttClient.publish("ddns/azure/ip/previous", this.currentIPv4, {
          retain: true,
        });
      }
    }
  }

  publishLastUpdate() {
    if (this.lastUpdateTime) {
      this.mqttClient.publish(
        "ddns/azure/last_update",
        this.lastUpdateTime.toISOString(),
        { retain: true }
      );
    }
  }

  publishDomainStatus(zone, status, message = "") {
    const topic = `ddns/azure/domains/${zone.replace(".", "_")}/status`;
    const payload = JSON.stringify({
      status,
      message,
      timestamp: new Date().toISOString(),
    });
    this.mqttClient.publish(topic, payload, { retain: true });
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logLevel = this.config.log_level || "info";

    const levels = { debug: 0, info: 1, warning: 2, error: 3 };
    if (levels[level] >= levels[logLevel]) {
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  shutdown() {
    this.log("info", "Shutting down Azure Dynamic DNS service...");

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    if (this.mqttClient) {
      this.publishStatus("offline");
      this.mqttClient.end();
    }
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
