"use strict";
const bcrypt = require("bcryptjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Contraseña para el administrador
    const adminPassword = "Angelina1973$";

    // Generar un hash para la contraseña del administrador
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Insertar el usuario admin
    await queryInterface.bulkInsert("Users", [
      {
        name: "Denny Schmidt",
        email: "denny@dasco.cl",
        password: hashedPassword, // Contraseña hasheada
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Eliminar el usuario admin (si se necesita revertir)
    await queryInterface.bulkDelete("Users", { email: "denny@dasco.cl" }, {});
  },
};
