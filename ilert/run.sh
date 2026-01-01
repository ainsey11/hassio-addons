#!/usr/bin/with-contenv bashio
set -e

bashio::log.info "Starting iLert addon..."

# Read configuration from options.json
CONFIG_PATH="/data/options.json"

if [ -f "$CONFIG_PATH" ]; then
    export API_KEY=$(bashio::config 'api_key')
    export LOG_LEVEL=$(bashio::config 'log_level')
    export ILERT_EMAIL=$(bashio::config 'ilert_email')

    if [ -z "$API_KEY" ]; then
        bashio::log.warning "API key not configured"
    fi
else
    bashio::log.warning "Config file not found, using defaults"
    export API_KEY=""
    export LOG_LEVEL="info"
fi

# Get MQTT configuration
export MQTT_HOST=$(bashio::config 'mqtt_host')
export MQTT_PORT=$(bashio::config 'mqtt_port')
export MQTT_USER=$(bashio::config 'mqtt_user')
export MQTT_PASSWORD=$(bashio::config 'mqtt_password')
export POLL_INTERVAL=$(bashio::config 'poll_interval')

# Get calendar configuration
export CALENDAR_ENTITY=$(bashio::config 'calendar_entity')
export CALENDAR_PERSONAL_ONLY=$(bashio::config 'calendar_personal_only')
export CALENDAR_DAYS_AHEAD=$(bashio::config 'calendar_days_ahead')

bashio::log.info "MQTT configured: ${MQTT_HOST}:${MQTT_PORT} (user: ${MQTT_USER})"
bashio::log.info "Poll interval: ${POLL_INTERVAL} seconds"
if [ -n "$CALENDAR_ENTITY" ]; then
    bashio::log.info "Calendar sync enabled: ${CALENDAR_ENTITY}"
fi

# Start the Node.js application
bashio::log.info "Starting Node.js application..."
exec node /app/index.js
