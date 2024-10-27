const express = require("express");
const userRoutes = require("./user");
const workRoutes = require("./work");
const subgroupRoutes = require("./subgroup");
const partRoutes = require("./part");
const expenseRoutes = require("./expense");
const transferRoutes = require("./transfer");

const router = express.Router();

router.use("/users", userRoutes);
router.use("/works", workRoutes);
router.use("/subgroups", subgroupRoutes);
router.use("/parts", partRoutes);
router.use("/expenses", expenseRoutes);
router.use("/transfers", transferRoutes);

module.exports = router;
