# Changelog - Azure Dynamic DNS

All notable changes to Azure Dynamic DNS addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-27

### Changed

- **Code refactoring for maintainability**: Restructured codebase into modular architecture
  - Split monolithic `index.js` (637 lines) into organized modules
  - Created `utils/` directory for configuration, logging, MQTT, and HA API utilities
  - Created `functions/` directory for IP detection, DNS updates, and calendar integration
  - Improved error handling and separation of concerns

## [1.0.1] - 2025-12-27

### Updated

- Updated package versions to resolve dependabot warnings

## [1.0.0] - 2025-12-27

### Added

- **Initial release** of Azure Dynamic DNS addon
- **Multi-domain support**: Update multiple A and AAAA records across different Azure DNS zones
- **IPv4 and IPv6 support**: Configurable support for both IPv4 (A records) and IPv6 (AAAA records)
- **IP change detection**: Only updates DNS when your IP actually changes
- **Configurable intervals**: Set how often to check for IP changes (default: 5 minutes)
- **MQTT integration with auto-discovery**: All sensors automatically appear in Home Assistant
  - Service status binary sensor
  - Current and previous IPv4/IPv6 address sensors
  - Last update timestamp sensor
  - Per-domain status sensors
- **Calendar integration**: Optional logging of DNS updates to Home Assistant Local Calendar
  - Detailed event descriptions showing which records changed and their new values
  - 15-minute calendar events for easy tracking
- **Multiple IP services**: Uses multiple external services for reliable IP detection
- **Comprehensive error handling**: Robust error handling with retry logic
- **Detailed logging**: Configurable log levels (debug, info, warning, error)
