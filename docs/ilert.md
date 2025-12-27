# iLert Integration

Integrates iLert on-call management with Home Assistant, providing comprehensive monitoring and control of your on-call schedule, alerts, and incidents.

## Key Features

- **On-call status sensors**: Know who's currently on-call and when shifts change
- **Real-time alerts**: Monitor pending, accepted, and latest alerts
- **Incident tracking**: Keep track of open incidents and their status
- **Interactive controls**: Acknowledge alerts and mute notifications directly from Home Assistant
- **Calendar sync**: Sync your on-call schedule to Home Assistant Local Calendar
- **Heartbeat monitoring**: Monitor the status of your heartbeat monitors
- **Schedule management**: View current and next shift information
- **MQTT integration**: All sensors published via MQTT with auto-discovery

## Use Cases

- **Dashboard Integration**: Display on-call status on your Home Assistant dashboard
- **Automation Triggers**: Create automations based on on-call status or alert counts
- **Mobile Notifications**: Get notified through Home Assistant when you go on-call
- **Calendar View**: See your on-call schedule in Home Assistant's calendar
- **Quick Actions**: Acknowledge alerts or mute notifications without opening iLert
- **Status Monitoring**: Monitor heartbeat and service health from your dashboard

## Prerequisites

- Active iLert account with API access
- iLert API key with appropriate permissions
- Home Assistant with MQTT integration
- Local Calendar integration (optional, for schedule sync)

## Quick Start

1. Obtain your iLert API key from your account settings
2. Install and configure the addon with your API credentials
3. Optionally set up calendar integration for schedule sync
4. Sensors will automatically appear in Home Assistant via MQTT discovery
5. Use the sensors in dashboards, automations, and scripts

[📖 Full Documentation](../ilert/README.md)
