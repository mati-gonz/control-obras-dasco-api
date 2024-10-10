"use strict";
const bcrypt = require("bcrypt");
const owasp = require("owasp-password-strength-test");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Contraseña para el administrador
    const adminPassword = "Angelina1973$"; // Cambia esta contraseña según las necesidades de seguridad

    // Verificar la fortaleza de la contraseña utilizando owasp
    const passwordTestResult = owasp.test(adminPassword);
    if (!passwordTestResult.strong) {
      throw new Error(
        "La contraseña del administrador no cumple con los requisitos de fortaleza: " +
          passwordTestResult.errors.join(" "),
      );
    }

    // Generar un hash para la contraseña del administrador
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Insertar el usuario admin
    await queryInterface.bulkInsert("Users", [
      {
        name: "Denny Schmidt",
        email: "denny@dasco.cl", // Cambia este correo si es necesario
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
