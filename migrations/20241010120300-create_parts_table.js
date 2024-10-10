"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear la tabla Parts
    await queryInterface.createTable("Parts", {
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
      budget: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
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
        onDelete: "CASCADE",
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

    // Crear índices en las columnas relacionadas
    await queryInterface.addIndex("Parts", ["workId"]);
    await queryInterface.addIndex("Parts", ["subgroupId"]);
  },

  async down(queryInterface, Sequelize) {
    // Eliminar la tabla Parts
    await queryInterface.dropTable("Parts");
  },
};
