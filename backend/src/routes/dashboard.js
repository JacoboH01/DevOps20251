const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/stats',                dashboardController.getDashboardStats);
router.get('/export/monthly-sales', dashboardController.exportMonthlySales);
router.get('/export/top-products',  dashboardController.exportTopProducts);
router.get('/export/top-customers', dashboardController.exportTopCustomers);

module.exports = router;