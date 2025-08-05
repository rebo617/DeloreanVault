export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { trackingNumber } = req.query;
    
    if (!trackingNumber) {
        return res.json({ status: 'unknown', error: 'No tracking number provided' });
    }
    
    try {
        // Test if environment variable exists
        if (!process.env.TRACK17_API_KEY) {
            return res.json({ 
                status: 'unknown', 
                error: 'API key not configured',
                trackingNumber: trackingNumber
            });
        }
        
        // Just test the register endpoint
        const response = await fetch('https://api.17track.net/track/v2.2/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                '17token': process.env.TRACK17_API_KEY
            },
            body: JSON.stringify([{
                number: trackingNumber,
                carrier: 0
            }])
        });
        
        const data = await response.json();
        
        return res.json({ 
            status: 'unknown', 
            error: 'Test completed - check response',
            trackingNumber: trackingNumber,
            apiResponse: data,
            responseStatus: response.status
        });
        
    } catch (error) {
        return res.json({ 
            status: 'unknown', 
            error: `Caught error: ${error.message}`,
            trackingNumber: trackingNumber
        });
    }
}
