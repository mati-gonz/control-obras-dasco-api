// Descripción: Este archivo se encarga de definir las relaciones entre los modelos de la base de datos.
const sequelize = require("../config/database");
const User = require("./user");
const Work = require("./work");
const Subgroup = require("./subgroup");
const Part = require("./part");
const Expense = require("./expense");

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

module.exports = {
  sequelize,
  User,
  Work,
  Subgroup,
  Part,
  Expense,
};
