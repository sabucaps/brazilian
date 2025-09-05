app.get('/api/tests/type/:type', async (req, res) => {
  try {
    const type = decodeURIComponent(req.params.type);
    console.log('🔍 Searching for tests with type:', type);
    
    const tests = await Test.find({ type });
    
    console.log('✅ Found', tests.length, 'tests');
    res.json(tests);
  } catch (error) {
    console.error('❌ Error fetching tests by type:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tests by type',
      details: error.message 
    });
  }
});