const express = require('express');
const { register, login, deleteUser, editUser } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.delete('/delete/:id', deleteUser);
router.put('/edit/:id', editUser);

module.exports = router;