// server.js
// This is the entry point of your backend.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const authRoutes = require('./routes/authRoutes');
const cropRoutes = require('./routes/cropRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
  res.send('FarmLink backend running');
});

// DB test route
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ success: true, result: rows[0].result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auth routes -> anything starting with /api/auth goes to authRoutes.js
app.use('/api/auth', authRoutes);
app.use('/api/crops', cropRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});