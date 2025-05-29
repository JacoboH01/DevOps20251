const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders.controller');

router.post('/',                 ordersController.create);
router.get('/:id',               ordersController.getByIdUser);
router.get('/',                  ordersController.getUserOrders);
router.get('/stats/:userId',     ordersController.getUserOrderStats);
router.get('/:orderId/:userId',  ordersController.getOrderDetails);
router.patch('/:orderId/cancel', ordersController.cancelOrder);


module.exports = router;