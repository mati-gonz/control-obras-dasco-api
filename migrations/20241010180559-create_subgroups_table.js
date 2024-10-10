"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear la tabla Subgroups
    await queryInterface.createTable("Subgroups", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      workId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Works", // Nombre de la tabla 'Works'
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false,
      },
      budget: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
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

    // Crear índice en la columna workId
    await queryInterface.addIndex("Subgroups", ["workId"]);
  },

  async down(queryInterface, Sequelize) {
    // Eliminar la tabla Subgroups
    await queryInterface.dropTable("Subgroups");
  },
};
