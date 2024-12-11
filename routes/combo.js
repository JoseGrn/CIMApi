const express = require('express');
const { createCombo, getAllCombos, getComboById, editCombo, deleteCombo } = require('../controllers/comboController');

const router = express.Router();

router.post('/create', createCombo);
router.get('/all', getAllCombos);
router.get('/:id', getComboById);
router.put('/edit/:id', editCombo);
router.delete('/delete/:id', deleteCombo);

module.exports = router;
