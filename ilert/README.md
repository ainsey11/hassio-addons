# iLert Home Assistant Addon

A Node.js-based Home Assistant addon for iLert integration.

## Configuration

The addon requires the following configuration options:

- `api_key` (required): Your iLert API key
- `log_level` (optional): Logging level (debug, info, warning, error) - default: info

## Usage

1. Install the addon
2. Configure your iLert API key in the addon configuration
3. Start the addon
4. The addon will be available on port 8099

## Development

The addon is built with:

- Node.js
- Axios for HTTP requests

Customize the webhook handler in `index.js` to implement your specific iLert integration logic.
