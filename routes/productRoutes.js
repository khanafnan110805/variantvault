const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productController');

// Landing
router.get('/', ctrl.getLanding);

// Add product
router.get('/add', ctrl.getAddProduct);
router.post('/add', ctrl.postAddProduct);

// Products list
router.get('/products', ctrl.getProducts);

// Product detail
router.get('/product/:id', ctrl.getProductDetail);

// Edit product
router.get('/edit/:id', ctrl.getEditProduct);
router.post('/edit/:id', ctrl.postEditProduct);

// Delete product
router.post('/delete/:id', ctrl.postDeleteProduct);

module.exports = router;
