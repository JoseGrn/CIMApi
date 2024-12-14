const express = require('express');
const { createSale, getAllSales, getSaleById, getSalesByDay, getSalesByWeek, getSalesByMonth } = require('../controllers/salesController');

const router = express.Router();

router.post('/create', createSale);
router.get('/all', getAllSales);
router.get('/day', getSalesByDay);
router.get('/week', getSalesByWeek);
router.get('/month', getSalesByMonth);
router.get('/:id', getSaleById);

module.exports = router;