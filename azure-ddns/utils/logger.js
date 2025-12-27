/**
 * Create a logger instance with configurable log levels
 * @param {string} logLevel - Minimum log level to output (debug, info, warning, error)
 * @returns {Object} Logger object with log methods
 */
function createLogger(logLevel = "info") {
  const levels = { debug: 0, info: 1, warning: 2, error: 3 };
  const currentLevel = levels[logLevel] || levels.info;

  return {
    debug: (message) => log("debug", message, currentLevel),
    info: (message) => log("info", message, currentLevel),
    warning: (message) => log("warning", message, currentLevel),
    error: (message) => log("error", message, currentLevel),
  };
}

/**
 * Internal logging function
 * @param {string} level - Log level
 * @param {string} message - Message to log
 * @param {number} currentLevel - Current minimum log level
 */
function log(level, message, currentLevel) {
  const levels = { debug: 0, info: 1, warning: 2, error: 3 };
  if (levels[level] >= currentLevel) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }
}

module.exports = {
  createLogger,
};
