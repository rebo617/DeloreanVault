export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
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
        'auto': 0
    };
    
    const carrierCode = carrierCodes[carrier?.toLowerCase()] || 0;
    
    try {
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
        
        // Then query for tracking info
        const queryResponse = await fetch('https://api.17track.net/track/v2.2/gettrackinfo', {
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
        
        const queryData = await queryResponse.json();
        
        if (queryData.code === 0 && queryData.data?.accepted?.length > 0) {
            const trackInfo = queryData.data.accepted[0];
