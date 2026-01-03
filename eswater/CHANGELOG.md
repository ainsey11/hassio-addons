# Changelog - Eswater

All notable changes to Eswater addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-03

### Added

- **Initial release** of ESWater Smart Meter integration for Home Assistant
- Automated login and data retrieval from Essex & Suffolk Water portal using Playwright
- Hybrid browser-based authentication with API data extraction
- MQTT integration with Home Assistant auto-discovery for seamless setup
- Multiple MQTT sensors:
  - Daily water usage (with detailed attributes)
  - Latest hourly reading
  - Hourly breakdown JSON for charting
  - Reading count
  - Last updated timestamp
  - Data age indicator
  - Connection status
- Intelligent failure tracking and account lockout prevention
- Configurable update intervals (default: 1 hour)
- Support for ESWater's 48-hour data delay with automatic fallback (checks 3-7 days back)
- Comprehensive error handling and recovery
- Configurable log levels (debug, info, warning, error)
- 20-second network stabilization delay on startup for container environments
- Graceful shutdown handling
- Clean, maintainable codebase with modular architecture
