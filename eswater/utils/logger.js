function createLogger(logLevel = "info") {
  const levels = { debug: 0, info: 1, warning: 2, error: 3 };
  const currentLevel = levels[logLevel] || 1;

  return {
    debug: (message) => {
      if (levels.debug >= currentLevel) {
        console.log(`[${new Date().toISOString()}] [DEBUG] ${message}`);
      }
    },
    info: (message) => {
      if (levels.info >= currentLevel) {
        console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
      }
    },
    warning: (message) => {
      if (levels.warning >= currentLevel) {
        console.log(`[${new Date().toISOString()}] [WARNING] ${message}`);
      }
    },
    error: (message) => {
      if (levels.error >= currentLevel) {
        console.log(`[${new Date().toISOString()}] [ERROR] ${message}`);
      }
    },
  };
}

module.exports = {
  createLogger,
};
