const axios = require('axios');

const searchImages = async (query) => {
  try {
    // For now, return a placeholder image
    return `https://via.placeholder.com/300x200?text=${encodeURIComponent(query)}`;
  } catch (error) {
    console.error('Image search error:', error);
    return null;
  }
};

module.exports = { searchImages };