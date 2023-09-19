const express = require('express');
const router = express.Router();

const userRoutes = require('./userRoutes');
const roleRoutes = require('./roleRoutes');
router.use('/users', userRoutes)
router.use('/roles', roleRoutes)

module.exports = router;