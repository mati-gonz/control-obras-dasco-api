// logger.js
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;

// Formato personalizado para los logs
const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Crear el logger
const logger = createLogger({
  level: "info", // Nivel mínimo de logging
  format: combine(timestamp(), myFormat),
  transports: [
    new transports.Console(), // Loggea en la consola
    new transports.File({ filename: "logs/app.log" }), // Loggea en un archivo
  ],
});

module.exports = logger;
