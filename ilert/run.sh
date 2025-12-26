#!/usr/bin/with-contenv bashio
set -e

bashio::log.info "Starting iLert addon..."

# Read configuration from options.json
CONFIG_PATH="/data/options.json"

if [ -f "$CONFIG_PATH" ]; then
    export API_KEY=$(bashio::config 'api_key')
    export LOG_LEVEL=$(bashio::config 'log_level')

    bashio::log.info "Configuration loaded successfully"
    bashio::log.info "Log level: ${LOG_LEVEL}"

    if [ -z "$API_KEY" ]; then
        bashio::log.warning "API key not configured"
    fi
else
    bashio::log.warning "Config file not found, using defaults"
    export API_KEY=""
    export LOG_LEVEL="info"
fi

# Start the Node.js application
bashio::log.info "Starting Node.js application..."
exec node /app/index.js
