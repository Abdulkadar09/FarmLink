// controllers/cropController.js

const db = require('../db');

// ---------------------------------------------
// GET /api/crops/crop-master
// Returns the standard crop list for the "select crop" dropdown
// ---------------------------------------------
async function getCropMaster(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM CROP_MASTER ORDER BY crop_name');
    res.json({ success: true, crops: rows });
  } catch (err) {
    console.error('Get crop master error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ---------------------------------------------
// GET /api/crops/price-index/:crop_master_id
// Returns the current mandi reference price for a crop
// (shown to farmer while they set their own price)
// ---------------------------------------------
async function getPriceIndex(req, res) {
  try {
    const { crop_master_id } = req.params;
    const [rows] = await db.query(
      `SELECT * FROM PRICE_INDEX WHERE crop_master_id = ? ORDER BY updated_date DESC LIMIT 1`,
      [crop_master_id]
    );
    if (rows.length === 0) {
      return res.json({ success: true, mandi_price_per_kg: null, message: 'No price data available yet' });
    }
    res.json({ success: true, mandi_price_per_kg: rows[0].mandi_price_per_kg, updated_date: rows[0].updated_date });
  } catch (err) {
    console.error('Get price index error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ---------------------------------------------
// POST /api/crops
// Farmer creates a new crop listing
// ---------------------------------------------
async function addCrop(req, res) {
  try {
    const {
      farmer_id, crop_master_id, quality_grade,
      total_quantity, expected_price_per_kg, harvest_date,
      latitude, longitude, location_text
    } = req.body;

    // Basic validation - these fields are non-negotiable for a listing to make sense
    if (!farmer_id || !crop_master_id || !total_quantity || !expected_price_per_kg || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const [result] = await db.query(
      `INSERT INTO CROPS
        (farmer_id, crop_master_id, quality_grade, total_quantity, available_quantity,
         expected_price_per_kg, harvest_date, latitude, longitude, location_text, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available')`,
      [
        farmer_id, crop_master_id, quality_grade || 'Standard',
        total_quantity, total_quantity, // available_quantity starts equal to total_quantity
        expected_price_per_kg, harvest_date || null,
        latitude, longitude, location_text || null
      ]
    );

    res.status(201).json({ success: true, message: 'Crop listed successfully', crop_id: result.insertId });

  } catch (err) {
    console.error('Add crop error:', err);
    res.status(500).json({ success: false, message: 'Server error while adding crop' });
  }
}

// ---------------------------------------------
// GET /api/crops/farmer/:farmer_id
// Returns all listings belonging to a specific farmer (for their dashboard)
// ---------------------------------------------
async function getFarmerCrops(req, res) {
  try {
    const { farmer_id } = req.params;
    const [rows] = await db.query(
      `SELECT c.*, cm.crop_name, cm.category
       FROM CROPS c
       JOIN CROP_MASTER cm ON c.crop_master_id = cm.crop_master_id
       WHERE c.farmer_id = ?
       ORDER BY c.created_at DESC`,
      [farmer_id]
    );
    res.json({ success: true, crops: rows });
  } catch (err) {
    console.error('Get farmer crops error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ---------------------------------------------
// PATCH /api/crops/:crop_id/expire
// Farmer manually marks their own listing as Expired
// ---------------------------------------------
async function markExpired(req, res) {
  try {
    const { crop_id } = req.params;
    const { farmer_id } = req.body; // to confirm ownership

    const [rows] = await db.query('SELECT * FROM CROPS WHERE crop_id = ?', [crop_id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (rows[0].farmer_id !== farmer_id) {
      return res.status(403).json({ success: false, message: 'You do not own this listing' });
    }
    if (rows[0].status !== 'Available') {
      return res.status(400).json({ success: false, message: `Cannot expire a listing that is ${rows[0].status}` });
    }

    await db.query(`UPDATE CROPS SET status = 'Expired' WHERE crop_id = ?`, [crop_id]);
    res.json({ success: true, message: 'Listing marked as Expired' });

  } catch (err) {
    console.error('Mark expired error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { getCropMaster, getPriceIndex, addCrop, getFarmerCrops, markExpired };