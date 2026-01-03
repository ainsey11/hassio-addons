# ESWater Smart Meter

Monitor your Essex & Suffolk Water smart meter consumption directly in Home Assistant, providing detailed insights into your daily and hourly water usage.

## Key Features

- **Automated data retrieval**: Automatically logs into ESWater portal and fetches smart meter data
- **Daily usage tracking**: Monitor your total daily water consumption in liters
- **Hourly breakdown**: Access detailed hourly consumption data for analysis
- **MQTT auto-discovery**: Sensors automatically appear in Home Assistant
- **Multiple sensors**: Daily usage, hourly readings, data age, connection status, and more
- **Account lockout prevention**: Intelligent failure tracking prevents multiple failed login attempts
- **Data delay handling**: Automatically handles ESWater's 48-hour data delay by checking 3-7 days back
- **Configurable updates**: Set custom update intervals (default: 1 hour)
- **Rich attributes**: Detailed sensor attributes including min/max/mean hourly values

## Available Sensors

- **Daily Water Usage**: Total water consumed for the day (with detailed attributes)
- **Latest Hourly Reading**: Most recent hourly consumption value
- **Water Hourly Breakdown**: JSON data for charting and analysis
- **Available Data Points**: Number of readings retrieved
- **Last Reading Time**: Timestamp of the most recent data
- **Data Age**: How many days back the data is from (typically 2-3 days)
- **Connection Status**: Current status of the ESWater integration

## Use Cases

- **Water Monitoring**: Track your household water consumption patterns
- **Cost Awareness**: Understand your water usage to manage bills
- **Leak Detection**: Identify unusual consumption patterns that might indicate leaks
- **Usage Optimization**: Analyze hourly data to optimize water usage
- **Automation**: Create alerts for high usage or potential issues

## Prerequisites

- Essex & Suffolk Water account with smart meter installed
- Valid ESWater online account credentials (email and password)
- Home Assistant with MQTT integration

## Quick Start

1. Install the addon from the repository
2. Configure with your ESWater account credentials
3. Set your preferred MQTT settings (defaults to core-mosquitto)
4. Optionally adjust update interval and log level
5. Start the addon - sensors will appear automatically via MQTT discovery

## Important Notes

- ESWater data is typically 48 hours behind real-time
- The addon automatically handles this delay by checking multiple days back
- Login attempts are rate-limited to prevent account lockouts
- First data fetch may take 30-45 seconds due to browser automation

[📖 Full Documentation](../eswater/README.md)
