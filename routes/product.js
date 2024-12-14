const express = require('express');
const { createProduct, getAllProducts, getProductById, editProduct, deleteProduct, addInventory } = require('../controllers/productController');

const router = express.Router();

// Ruta para crear un nuevo producto
router.post('/create', createProduct);
router.get('/all', getAllProducts);
router.get('/:id', getProductById);
router.put('/edit/:id', editProduct);
router.delete('/delete/:id', deleteProduct);
router.post('/inventory/add', addInventory);

module.exports = router;