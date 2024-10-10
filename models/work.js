// Descripción: Modelo de la tabla 'Works' con sus atributos y relaciones con otras tablas.
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Work = sequelize.define(
  "Work",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalBudget: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    adminId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Users",
        key: "id",
      },
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    indexes: [
      { fields: ["adminId"] }, // Índice en la columna 'adminId'
      { fields: ["startDate"] }, // Índice en 'startDate' si haces consultas por fecha de inicio
      { fields: ["endDate"] }, // Índice en 'endDate' si haces consultas por fecha de fin
    ],
  },
);

module.exports = Work;
