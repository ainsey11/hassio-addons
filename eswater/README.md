# Eswater

Monitor Essex and Suffolk Water Smart Meter

## Features

- **MQTT Integration**: Auto-discovery sensors for Home Assistant
- **Configurable Logging**: Multiple log levels for debugging
- **Robust Error Handling**: Graceful error handling and recovery
- **Lightweight**: Efficient resource usage

## Configuration

### Basic Configuration

```yaml
# Add your configuration example here
mqtt_host: "core-mosquitto"
mqtt_port: 1883
mqtt_user: ""
mqtt_password: ""
log_level: "info"
```

### Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `mqtt_host` | No | core-mosquitto | MQTT broker hostname |
| `mqtt_port` | No | 1883 | MQTT broker port |
| `mqtt_user` | No | - | MQTT username |
| `mqtt_password` | No | - | MQTT password |
| `log_level` | No | info | Logging level (debug, info, warning, error) |

## MQTT Integration

The addon publishes the following MQTT topics with auto-discovery:

### Sensors

- `sensor.eswater_status` - Service status

All sensors will automatically appear in Home Assistant via MQTT discovery.

## Installation

1. Add this repository to your Home Assistant instance
2. Install the "Eswater" addon
3. Configure the addon with your settings
4. Start the addon

## Support

For issues and feature requests, please use the GitHub repository issue tracker.
