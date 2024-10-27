"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Transfers", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      adminId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL", // Cambiar a SET NULL para pruebas
      },
      workId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Works",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL", // Cambiar a SET NULL para pruebas
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Crear índices en las columnas relacionadas
    await queryInterface.addIndex("Transfers", ["adminId"]);
    await queryInterface.addIndex("Transfers", ["userId"]);
    await queryInterface.addIndex("Transfers", ["workId"]);
    await queryInterface.addIndex("Transfers", ["date"]);
  },

  async down(queryInterface, Sequelize) {
    // Eliminar la tabla Transfers
    await queryInterface.dropTable("Transfers");
  },
};
