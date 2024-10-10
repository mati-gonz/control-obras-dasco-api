"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear la tabla Works
    await queryInterface.createTable("Works", {
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
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      totalBudget: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      adminId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Users", // Nombre de la tabla 'Users'
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true, // Puede ser NULL si no hay un admin asignado
      },
      isArchived: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.addIndex("Works", ["adminId"]);
    await queryInterface.addIndex("Works", ["startDate"]);
    await queryInterface.addIndex("Works", ["endDate"]);
  },

  async down(queryInterface, Sequelize) {
    // Eliminar la tabla Works
    await queryInterface.dropTable("Works");
  },
};
