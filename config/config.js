require("dotenv").config(); // Cargar variables de entorno desde .env

module.exports = {
  development: {
    username: process.env.DB_USER || "matias_dasco",
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || "gestion_obras_db",
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: "postgres",
  },
  test: {
    username: process.env.DB_USER || "matias_dasco",
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME_TEST || "gestion_obras_db_test",
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: "postgres",
  },
  production: {
    username: process.env.DB_USER, // Sin valores por defecto, debe estar definido en el .env de producción
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true, // Requiere SSL en producción
        rejectUnauthorized: false, // Esto depende de tu proveedor de base de datos. Si usas AWS RDS o Heroku, generalmente se necesita `false`
      },
    },
    logging: false, // Desactiva el logging en producción para mejor rendimiento y seguridad
  },
};
