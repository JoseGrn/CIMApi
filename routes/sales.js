const express = require('express');
const { createSale, getAllSales, getSaleById } = require('../controllers/salesController');

const router = express.Router();

router.post('/create', createSale);
router.get('/all', getAllSales);
router.get('/:id', getSaleById);

module.exports = router;