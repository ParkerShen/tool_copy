const express = require('express');
const router = express.Router();

const userRoutes = require('./userRoutes');
const roleRoutes = require('./roleRoutes');
const uploadRoutes = require('./uploadRoutes');
router.use('/users', userRoutes)
router.use('/roles', roleRoutes)
router.use('/uploads', uploadRoutes)

module.exports = router;