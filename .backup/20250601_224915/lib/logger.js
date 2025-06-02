class Logger {
  constructor(context) {
    this.context = context;
  }

  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').slice(0, -5);
  }

  formatMessage(level, message, error = null) {
    const timestamp = this.getTimestamp();
    const baseMsg = `${timestamp} ${level}: ${message}`;
    if (error) {
      return `${baseMsg}\n${error.stack || error.message || error}`;
    }
    return baseMsg;
  }

  info(message) {
    console.log(this.formatMessage('info', message));
  }

  warn(message) {
    console.warn(this.formatMessage('warn', message));
  }

  error(message, error = null) {
    console.error(this.formatMessage('error', message, error));
  }

  debug(message) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message));
    }
  }
}

export default Logger; 