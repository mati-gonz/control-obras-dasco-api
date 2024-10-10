"use strict";
const bcrypt = require("bcrypt");
const owasp = require("owasp-password-strength-test");

module.exports = {
  async up(queryInterface, Sequelize) {
    // Contraseña para el administrador
    const adminPassword = "Angelina1973$"; // Contraseña definida

    // Verificar la fortaleza de la contraseña usando owasp
    const passwordTestResult = owasp.test(adminPassword);
    if (!passwordTestResult.strong) {
      throw new Error(
        "La contraseña del administrador no cumple con los requisitos de fortaleza: " +
          passwordTestResult.errors.join(" "),
      );
    }

    // Hashear la contraseña del administrador
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
    // Eliminar el usuario admin en caso de deshacer el seed
    await queryInterface.bulkDelete("Users", { email: "denny@dasco.cl" }, {});
  },
};
