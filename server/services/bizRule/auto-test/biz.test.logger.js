import { format, createLogger, transports } from 'winston';

const dataLogConfig = {
  transports: [
    new transports.File({
      filename: 'services/bizRule/auto-test/biz-test-data.log',
      maxsize: 5242880, // 5MB
    }),
  ],
  format: format.combine(
    format.label({
      label: '[Biz-Test]',
    }),
    format.timestamp({
      format: 'MM-DD-YYYY HH:mm:ss',
    }),
    // Format the metadata object
    format.metadata({ fillExcept: ['timestamp', 'label', 'level', 'message'] }),
    format.json(),
    format.prettyPrint(),
  ),
};

const issueLogConfig = {
  transports: [
    new transports.Console({
      json: true,
      handleExceptions: true,
      colorize: true,
    }),
    new transports.File({
      filename: 'services/bizRule/auto-test/biz-test-run.log',
    }),
  ],
  format: format.combine(
    format.label({
      label: '[Biz-Test]',
    }),
    format.timestamp({
      format: 'MM-DD-YYYY HH:mm:ss',
    }),
    format.printf(
      info =>
        `${[info.timestamp]}: ${info.label}: ${info.level === 'error' ? `❌ ${info.level}` : `✔️ ${info.level}`}: ${
          info.message
        }`,
    ),
  ),
};

export const bizDataLogger = createLogger(dataLogConfig);

export const bizRunLogger = createLogger(issueLogConfig);
