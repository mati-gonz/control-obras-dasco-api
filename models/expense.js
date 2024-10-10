// Descripción: Modelo para Expenses.
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Expense = sequelize.define(
  "Expense",
  {
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    partId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Parts",
        key: "id",
      },
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
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Users",
        key: "id",
      },
    },
    receiptUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receiptExtension: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    indexes: [
      { fields: ["partId"] }, // Índice en 'partId'
      { fields: ["subgroupId"] }, // Índice en 'subgroupId'
      { fields: ["workId"] }, // Índice en 'workId'
      { fields: ["userId"] }, // Índice en 'userId'
    ],
  },
);

module.exports = Expense;
