// Descripción: Modelo de la tabla 'Parts'.
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Part = sequelize.define(
  "Part",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    budget: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    subgroupId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Subgroups",
        key: "id",
      },
      allowNull: true,
    },
    workId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Works",
        key: "id",
      },
      allowNull: false,
    },
  },
  {
    indexes: [
      { fields: ["workId"] }, // Índice en 'workId'
      { fields: ["subgroupId"] }, // Índice en 'subgroupId'
    ],
  },
);

module.exports = Part;
