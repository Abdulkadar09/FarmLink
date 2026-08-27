// routes/cropRoutes.js

const express = require('express');
const router = express.Router();
const {
  getCropMaster, getPriceIndex, addCrop, getFarmerCrops, markExpired
} = require('../controllers/cropController');

router.get('/crop-master', getCropMaster);
router.get('/price-index/:crop_master_id', getPriceIndex);
router.post('/', addCrop);
router.get('/farmer/:farmer_id', getFarmerCrops);
router.patch('/:crop_id/expire', markExpired);

module.exports = router;