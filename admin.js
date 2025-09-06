/ routes/admin.js
const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin'); // You'll need to create this model

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ status: 'Admin API is working', timestamp: new Date().toISOString() });
});

// Setup admin credentials
router.post('/setup', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if admin already exists
    let admin = await Admin.findOne({});
    if (admin) {
      // Update existing admin
      admin.username = username;
      admin.password = await bcrypt.hash(password, 10);
      await admin.save();
      return res.json({ message: 'Admin credentials updated successfully' });
    }
    
    // Create new admin
    admin = new Admin({
      username,
      password: await bcrypt.hash(password, 10)
    });
    
    await admin.save();
    res.json({ message: 'Admin credentials created successfully' });
  } catch (error) {
    console.error('Error setting up admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;