/**
 * Create a logger instance with configurable log level
 * @param {string} logLevel - The log level (debug, info, warning, error)
 * @returns {Object} Logger instance with debug, info, warning, and error methods
 */
function createLogger(logLevel = "info") {
  return {
    debug: (msg) =>
      ["debug"].includes(logLevel) && console.log(`[DEBUG] ${msg}`),
    info: (msg) =>
      ["debug", "info"].includes(logLevel) && console.log(`[INFO] ${msg}`),
    warning: (msg) =>
      ["debug", "info", "warning"].includes(logLevel) &&
      console.warn(`[WARNING] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
  };
}

module.exports = { createLogger };