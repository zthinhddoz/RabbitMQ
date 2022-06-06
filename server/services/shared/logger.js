import { format, createLogger, transports } from 'winston';
import colors from 'colors';
import logSymbols from 'log-symbols';
import { NODE_ENV } from '~/env';

const newFormat = format.printf(msg => {
  if (msg[Symbol.for('level')] === 'info') {
    return `${msg.timestamp} ${msg.label} ${msg.level}: ${logSymbols.success} ${colors.green(msg.message)}`;
  }
  if (msg[Symbol.for('level')] === 'error') {
    const printLogErr = msg instanceof Error ? msg.stack : msg.message;
    return `${msg.timestamp} ${msg.label} ${msg.level}: ${logSymbols.error} ${colors.red(printLogErr)}`;
  }
});

// File limit at 5Mb, if higher than it, auto add a new file
const logger = createLogger({
  format: format.combine(format.colorize(), format.label({ label: '[Shine-PF]' }), format.timestamp(), newFormat),
  transports: [
    new transports.Console({
      json: true,
      handleExceptions: true,
      colorize: true,
    }),
    new transports.File({
      json: true,
      colorize: true,
      filename: './file/logs/error.log',
      maxsize: 5242880, // 5MB
      level: 'error',
    }),
    new transports.File({
      json: true,
      colorize: true,
      handleExceptions: true,
      filename: './file/logs/combined.log',
      maxsize: 5242880, // 5MB
    }),
  ],
});
// turn off logs
// logger.transports.forEach((t) => (t.silent = true));
if (NODE_ENV !== 'production') {
  logger.debug('Logging initialized at debug level');
}

export default logger;
