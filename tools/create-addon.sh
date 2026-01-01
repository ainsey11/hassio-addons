#!/bin/bash

# Home Assistant Addon Generator
# Creates a new Node.js addon with standard structure and templates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Function to validate addon name
validate_name() {
    if [[ ! "$1" =~ ^[a-z][a-z0-9-]*[a-z0-9]$ ]]; then
        print_error "Invalid addon name. Must be lowercase, start with letter, contain only letters/numbers/hyphens, end with letter/number"
        exit 1
    fi
}

# Function to convert kebab-case to Title Case
to_title_case() {
    echo "$1" | sed 's/-/ /g' | sed 's/\b\w/\U&/g'
}

# Function to convert kebab-case to snake_case
to_snake_case() {
    echo "$1" | sed 's/-/_/g'
}

# Main function
main() {
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <addon-name> [description]"
        echo ""
        echo "Examples:"
        echo "  $0 plex-manager 'Manage Plex Media Server'"
        echo "  $0 smart-doorbell 'AI-powered doorbell integration'"
        echo ""
        echo "The addon name should be:"
        echo "  - lowercase"
        echo "  - use hyphens for word separation"
        echo "  - start and end with letter or number"
        echo "  - contain only letters, numbers, and hyphens"
        exit 1
    fi

    ADDON_NAME="$1"
    ADDON_DESCRIPTION="${2:-A Home Assistant addon for $ADDON_NAME}"

    validate_name "$ADDON_NAME"

    ADDON_TITLE=$(to_title_case "$ADDON_NAME")
    ADDON_SNAKE=$(to_snake_case "$ADDON_NAME")
    ADDON_DIR="$ADDON_NAME"

    print_info "Creating addon: $ADDON_TITLE"
    print_info "Directory: $ADDON_DIR"
    print_info "Description: $ADDON_DESCRIPTION"

    # Check if directory already exists
    if [ -d "$ADDON_DIR" ]; then
        print_error "Directory $ADDON_DIR already exists!"
        exit 1
    fi

    # Create addon directory
    mkdir -p "$ADDON_DIR"

    # Create subdirectories
    mkdir -p "$ADDON_DIR/translations"

    print_success "Created addon structure"

    # Generate files
    generate_config_yaml
    generate_dockerfile
    generate_package_json
    generate_index_js
    generate_run_sh
    generate_build_yaml
    generate_readme
    generate_changelog
    generate_translations

    print_success "Generated all addon files"
    print_info "Next steps:"
    echo "  1. cd $ADDON_DIR"
    echo "  2. npm install"
    echo "  3. Edit config.yaml with your specific configuration"
    echo "  4. Implement your addon logic in index.js"
    echo "  5. Update README.md with detailed documentation"
    echo "  6. Update CHANGELOG.md as you add features"
    echo "  7. Test with: ha addons install local_$ADDON_NAME"
}

generate_config_yaml() {
    cat > "$ADDON_DIR/config.yaml" << EOF
name: "$ADDON_TITLE"
version: "1.0.0"
slug: "$ADDON_NAME"
description: "$ADDON_DESCRIPTION"
arch:
  - armhf
  - armv7
  - aarch64
  - amd64
  - i386
init: false
startup: application
boot: auto
hassio_api: true
homeassistant_api: true
options:
  # Add your addon-specific options here
  # Example:
  # api_key: ""
  # host: "localhost"
  # port: 8080
  mqtt_host: "core-mosquitto"
  mqtt_port: 1883
  mqtt_user: ""
  mqtt_password: ""
  log_level: "info"
schema:
  # Define your addon's configuration schema here
  # Example:
  # api_key: str
  # host: str?
  # port: port?
  mqtt_host: str?
  mqtt_port: port?
  mqtt_user: str?
  mqtt_password: password?
  log_level: list(debug|info|warning|error)?
EOF
}

generate_dockerfile() {
    cat > "$ADDON_DIR/Dockerfile" << EOF
ARG BUILD_FROM
FROM \$BUILD_FROM

# Install Node.js
RUN \\
    set -x \\
    && apk add --no-cache \\
        nodejs \\
        npm

# Copy addon files
COPY package*.json ./
COPY index.js ./
COPY run.sh ./

# Install npm dependencies
RUN npm ci --only=production

# Make run script executable
RUN chmod +x ./run.sh

CMD [ "./run.sh" ]
EOF
}

generate_package_json() {
    cat > "$ADDON_DIR/package.json" << EOF
{
  "name": "hassio-$ADDON_NAME-addon",
  "version": "1.0.0",
  "description": "$ADDON_DESCRIPTION",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1",
    "lint": "eslint *.js --fix"
  },
  "keywords": [
    "homeassistant",
    "$ADDON_NAME",
    "addon"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.7.0",
    "mqtt": "^5.10.0"
  },
  "devDependencies": {
    "eslint": "^9.0.0"
  }
}
EOF
}

generate_index_js() {
    cat > "$ADDON_DIR/index.js" << EOF
const fs = require("fs");
const axios = require("axios");
const mqtt = require("mqtt");

class ${ADDON_TITLE//' '/} {
  constructor() {
    this.config = this.loadConfig();
    this.mqttClient = null;

    this.initializeClients();
    this.startService();
  }

  loadConfig() {
    const configPath = "/data/options.json";
    if (!fs.existsSync(configPath)) {
      throw new Error("Configuration file not found");
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    // Add your configuration validation here
    // Example:
    // if (!config.api_key) {
    //   throw new Error("Missing required configuration: api_key");
    // }

    return config;
  }

  initializeClients() {
    // Initialize MQTT client
    const mqttUrl = \`mqtt://\${this.config.mqtt_host}:\${this.config.mqtt_port}\`;
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
      this.log("error", \`MQTT error: \${error.message}\`);
    });
  }

  setupAutoDiscovery() {
    this.log("info", "Setting up MQTT Auto Discovery...");

    // Device info for grouping all sensors
    const deviceInfo = {
      identifiers: ["${ADDON_SNAKE}"],
      name: "${ADDON_TITLE}",
      manufacturer: "Home Assistant Addon",
      model: "${ADDON_TITLE} Service",
      sw_version: "1.0.0"
    };

    // Example sensor - replace with your actual sensors
    this.publishAutoDiscovery("sensor", "${ADDON_SNAKE}_status", {
      name: "${ADDON_TITLE} Status",
      state_topic: "${ADDON_SNAKE}/status",
      icon: "mdi:check-circle",
      device: deviceInfo,
      unique_id: "${ADDON_SNAKE}_status"
    });

    this.log("info", "MQTT Auto Discovery setup complete");
  }

  publishAutoDiscovery(component, objectId, config) {
    const topic = \`homeassistant/\${component}/${ADDON_SNAKE}/\${objectId}/config\`;
    const payload = JSON.stringify(config);
    this.mqttClient.publish(topic, payload, { retain: true });
    this.log("debug", \`Published auto-discovery for \${component}.${ADDON_SNAKE}_\${objectId}\`);
  }

  publishStatus(status, message = "") {
    const topic = "${ADDON_SNAKE}/status";
    const payload = JSON.stringify({
      status,
      message,
      timestamp: new Date().toISOString(),
    });
    this.mqttClient.publish(topic, payload, { retain: true });
  }

  async startService() {
    this.log("info", "${ADDON_TITLE} service starting...");

    // Add your main service logic here
    // Example: periodic data fetching, API calls, etc.

    this.log("info", "Service started successfully");
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logLevel = this.config.log_level || "info";

    const levels = { debug: 0, info: 1, warning: 2, error: 3 };
    if (levels[level] >= levels[logLevel]) {
      console.log(\`[\${timestamp}] [\${level.toUpperCase()}] \${message}\`);
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the service
try {
  new ${ADDON_TITLE//' '/}();
} catch (error) {
  console.error(\`Failed to start ${ADDON_TITLE}: \${error.message}\`);
  process.exit(1);
}
EOF
}

generate_run_sh() {
    cat > "$ADDON_DIR/run.sh" << 'EOF'
#!/usr/bin/with-contenv bashio

# Start the addon
exec node index.js
EOF
}

generate_build_yaml() {
    cat > "$ADDON_DIR/build.yaml" << EOF
build_from:
  aarch64: ghcr.io/home-assistant/aarch64-base:3.20-alpine
  amd64: ghcr.io/home-assistant/amd64-base:3.20-alpine
  armhf: ghcr.io/home-assistant/armhf-base:3.20-alpine
  armv7: ghcr.io/home-assistant/armv7-base:3.20-alpine
  i386: ghcr.io/home-assistant/i386-base:3.20-alpine
EOF
}

generate_readme() {
    cat > "$ADDON_DIR/README.md" << EOF
# $ADDON_TITLE

$ADDON_DESCRIPTION

## Features

- **MQTT Integration**: Auto-discovery sensors for Home Assistant
- **Configurable Logging**: Multiple log levels for debugging
- **Robust Error Handling**: Graceful error handling and recovery
- **Lightweight**: Efficient resource usage

## Configuration

### Basic Configuration

\`\`\`yaml
# Add your configuration example here
mqtt_host: "core-mosquitto"
mqtt_port: 1883
mqtt_user: ""
mqtt_password: ""
log_level: "info"
\`\`\`

### Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| \`mqtt_host\` | No | core-mosquitto | MQTT broker hostname |
| \`mqtt_port\` | No | 1883 | MQTT broker port |
| \`mqtt_user\` | No | - | MQTT username |
| \`mqtt_password\` | No | - | MQTT password |
| \`log_level\` | No | info | Logging level (debug, info, warning, error) |

## MQTT Integration

The addon publishes the following MQTT topics with auto-discovery:

### Sensors

- \`sensor.${ADDON_SNAKE}_status\` - Service status

All sensors will automatically appear in Home Assistant via MQTT discovery.

## Installation

1. Add this repository to your Home Assistant instance
2. Install the "$ADDON_TITLE" addon
3. Configure the addon with your settings
4. Start the addon

## Support

For issues and feature requests, please use the GitHub repository issue tracker.
EOF
}

generate_changelog() {
    cat > "$ADDON_DIR/CHANGELOG.md" << EOF
# Changelog - $ADDON_TITLE

All notable changes to $ADDON_TITLE addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - $(date +%Y-%m-%d)

### Added

- **Initial release** of $ADDON_TITLE addon
- Basic addon structure and configuration
- MQTT integration with Home Assistant auto-discovery
- Comprehensive error handling and logging
- Configurable log levels (debug, info, warning, error)
EOF
}

generate_translations() {
    cat > "$ADDON_DIR/translations/en.json" << EOF
{
  "configuration": {
    "mqtt_host": {
      "name": "MQTT Host",
      "description": "MQTT broker hostname. Default: core-mosquitto (the official Mosquitto addon). Change if using external MQTT broker."
    },
    "mqtt_port": {
      "name": "MQTT Port",
      "description": "MQTT broker port. Default: 1883 for standard MQTT. Use 8883 for MQTT over TLS."
    },
    "mqtt_user": {
      "name": "MQTT Username",
      "description": "MQTT username configured in your Mosquitto addon or external MQTT broker. Leave empty if authentication is disabled."
    },
    "mqtt_password": {
      "name": "MQTT Password",
      "description": "MQTT password configured in your Mosquitto addon or external MQTT broker. Leave empty if authentication is disabled."
    },
    "log_level": {
      "name": "Log Level",
      "description": "Logging verbosity. Use 'info' for normal operation, 'debug' to troubleshoot issues, or 'warning' for minimal logging."
    }
  }
}
EOF
}

# Run main function
main "$@"