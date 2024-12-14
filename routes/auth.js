const express = require('express');
const { register, login, deleteUser, editUser, getAllUsers, getUserById, getUserRole } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.delete('/delete/:id', deleteUser);
router.put('/edit/:id', editUser);
router.get('/all', getAllUsers);
router.get('/role', getUserRole);
router.get('/:id', getUserById);

module.exports = router;