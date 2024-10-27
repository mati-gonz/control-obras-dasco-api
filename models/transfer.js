const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Transfer = sequelize.define(
  "Transfer",
  {
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    adminId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Users",
        key: "id",
      },
      allowNull: false,
      comment: "ID del administrador que realiza la transferencia",
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Users",
        key: "id",
      },
      allowNull: false,
      comment: "ID del usuario que recibe la transferencia",
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
      { fields: ["adminId"] },
      { fields: ["userId"] },
      { fields: ["workId"] },
      { fields: ["date"] }, // Para consultar transferencias por fecha
    ],
  },
);

module.exports = Transfer;
