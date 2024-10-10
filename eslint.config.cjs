const globals = require("globals");
const pluginJs = require("@eslint/js");
const prettierPlugin = require("eslint-plugin-prettier");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  {
    files: ["**/*.js"], // Aplica ESLint a todos los archivos .js
    ignores: ["node_modules/**", "build/**"], // Ignora estas carpetas
    languageOptions: {
      ecmaVersion: 12, // Soporte para ECMAScript 2021
      sourceType: "module", // Usa ECMAScript modules (import/export)
      globals: {
        ...globals.node, // Agrega las globales de Node.js
      },
    },
    plugins: {
      js: pluginJs,
      prettier: prettierPlugin, // Integra el plugin de Prettier
    },
    rules: {
      "no-unused-vars": "warn", // Advierte sobre variables no usadas
      "no-console": "off", // Permite el uso de console.log en el backend
      "prettier/prettier": "error", // Aplica las reglas de Prettier y muestra errores si no se cumplen
    },
  },
  // Incluye las configuraciones de Prettier
  prettierConfig,
];
