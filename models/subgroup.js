// Descripción: Modelo de la tabla 'Subgroups' con sus atributos.
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Subgroup = sequelize.define(
  "Subgroup",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    workId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Works",
        key: "id",
      },
    },
    budget: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  },
  {
    indexes: [
      { fields: ["workId"] }, // Índice en la columna 'workId'
    ],
  },
);

module.exports = Subgroup;
