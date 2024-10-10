"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear la tabla Expenses
    await queryInterface.createTable("Expenses", {
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
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      partId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Parts", // Nombre de la tabla 'Parts'
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      subgroupId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Subgroups", // Nombre de la tabla 'Subgroups'
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true,
      },
      workId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Works", // Nombre de la tabla 'Works'
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Users", // Nombre de la tabla 'Users'
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      receiptUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      receiptExtension: {
        type: Sequelize.STRING,
        allowNull: true,
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
    await queryInterface.addIndex("Expenses", ["partId"]);
    await queryInterface.addIndex("Expenses", ["subgroupId"]);
    await queryInterface.addIndex("Expenses", ["workId"]);
    await queryInterface.addIndex("Expenses", ["userId"]);
  },

  async down(queryInterface, Sequelize) {
    // Eliminar la tabla Expenses
    await queryInterface.dropTable("Expenses");
  },
};
