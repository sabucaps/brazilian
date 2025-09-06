const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

// Test endpoint - Check if admin API is working
router.get('/test', (req, res) => {
  res.json({
    status: 'Admin API is working',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint - Check MongoDB connection
router.get('/db-test', async (req, res) => {
  try {
    // Try to perform a simple database operation
    const adminCount = await Admin.countDocuments();
    res.json({
      connected: true,
      count: adminCount,
      message: 'MongoDB connection successful'
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

// Setup admin credentials
router.post('/setup', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Check if admin already exists
    let admin = await Admin.findOne({});
    if (admin) {
      // Update existing admin
      admin.username = username;
      admin.password = password;
      await admin.save();
      return res.json({ message: 'Admin credentials updated successfully' });
    }
    
    // Create new admin
    admin = new Admin({
      username,
      password
    });
    
    await admin.save();
    res.json({ message: 'Admin credentials created successfully' });
  } catch (error) {
    console.error('Error setting up admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find admin user
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    res.json({ message: 'Login successful' });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;