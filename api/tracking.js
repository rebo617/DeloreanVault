export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Test response
    return res.json({ 
        status: 'unknown',
        statusText: 'Test function working',
        error: 'This is a test response - API is working!',
        trackingNumber: req.query.trackingNumber || 'none',
        timestamp: new Date().toISOString()
    });
}
