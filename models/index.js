const sequelize = require("../config/database");
const User = require("./user");
const Work = require("./work");
const Subgroup = require("./subgroup");
const Part = require("./part");
const Expense = require("./expense");
const Transfer = require("./transfer"); // Importar el modelo Transfer

// Relación Usuario - Obras (Un usuario puede tener muchas obras)
User.hasMany(Work, { foreignKey: "adminId", as: "works" });
Work.belongsTo(User, { foreignKey: "adminId", as: "admin" });

// Relación Obras - Subgrupos (Una obra puede tener muchos subgrupos)
Work.hasMany(Subgroup, { foreignKey: "workId" });
Subgroup.belongsTo(Work, { foreignKey: "workId" });

// Relación Subgrupos - Partidas (Un subgrupo puede tener muchas partidas)
Subgroup.hasMany(Part, { foreignKey: "subgroupId" });
Part.belongsTo(Subgroup, { foreignKey: "subgroupId" });

// Relación Obras - Partidas (Una obra puede tener muchas partidas)
Work.hasMany(Part, { foreignKey: "workId" });
Part.belongsTo(Work, { foreignKey: "workId" });

// Relación Partidas - Gastos (Una partida puede tener muchos gastos)
Part.hasMany(Expense, { foreignKey: "partId" });
Expense.belongsTo(Part, { foreignKey: "partId" });

// Relación entre Gasto (Expense) y Usuario (User)
User.hasMany(Expense, { foreignKey: "userId" });
Expense.belongsTo(User, { foreignKey: "userId" });

// Nuevas asociaciones para Transferencias
User.hasMany(Transfer, { foreignKey: "userId", as: "receivedTransfers" }); // Usuario que recibe
Transfer.belongsTo(User, { foreignKey: "userId", as: "receiver" });

User.hasMany(Transfer, { foreignKey: "adminId", as: "madeTransfers" }); // Usuario que realiza la transferencia
Transfer.belongsTo(User, { foreignKey: "adminId", as: "admin" });

// Relación Obras - Transferencias (Una obra puede tener muchas transferencias)
Work.hasMany(Transfer, { foreignKey: "workId", as: "Transfers" }); // Agregar alias "Transfers"
Transfer.belongsTo(Work, { foreignKey: "workId" });

// Relación Obras - Gastos (Una obra puede tener muchos gastos)
Work.hasMany(Expense, { foreignKey: "workId", as: "Expenses" }); // Agregar alias "Expenses"
Expense.belongsTo(Work, { foreignKey: "workId" });

module.exports = {
  sequelize,
  User,
  Work,
  Subgroup,
  Part,
  Expense,
  Transfer,
};
