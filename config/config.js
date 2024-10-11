require("dotenv").config(); // Cargar variables de entorno desde .env

module.exports = {
  development: {
    username: process.env.DB_USER || "matias_dasco",
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || "gestion_obras_db",
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306, // Agregado el puerto
    dialect: "mysql", // Cambiado a MySQL
  },
  test: {
    username: process.env.DB_USER || "matias_dasco",
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME_TEST || "gestion_obras_db_test",
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306, // Agregado el puerto
    dialect: "mysql", // Cambiado a MySQL
  },
  production: {
    username: process.env.DB_USER, // Sin valores por defecto, debe estar definido en el .env de producción
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306, // Agregado el puerto
    dialect: "mysql", // Cambiado a MySQL
    dialectOptions: {
      charset: "utf8mb4", // Opciones específicas de MySQL, como los conjuntos de caracteres
    },
    logging: false, // Desactiva el logging en producción para mejor rendimiento
  },
};
