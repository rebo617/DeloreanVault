export default async function handler(req, res) {
    // Enable CORS for your domain
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { trackingNumber, carrier } = req.query;
    
    if (!trackingNumber) {
        return res.json({ status: 'unknown', error: 'No tracking number provided' });
    }
    
    // Map carrier names to 17track carrier codes
    const carrierCodes = {
        'ups': 16,
        'fedex': 5,
        'usps': 70,
        'dhl': 9,
        'amazon': 169,
        'auto': 0  // Auto-detect
    };
    
    const carrierCode = carrierCodes[carrier?.toLowerCase()] || 0; // Default to auto-detect
    
    try {
        // Debug: Log what we're sending
        console.log('Tracking request:', {
            trackingNumber,
            carrier,
            carrierCode
        });
        
        // First, register the tracking number
        const registerResponse = await fetch('https://api.17track.net/track/v2.2/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                '17token': process.env.TRACK17_API_KEY
            },
            body: JSON.stringify([{
                number: trackingNumber,
                carrier: carrierCode
            }])
        });
        
        const registerData = await registerResponse.json();
        console.log('Register response:', JSON.s
