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
    
    const { trackingNumber } = req.query;
    
    if (!trackingNumber) {
        return res.json({ status: 'unknown', error: 'No tracking number provided' });
    }
    
    try {
        const response = await fetch('https://api.17track.net/track/v1/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                '17token': process.env.TRACK17_API_KEY
            },
            body: JSON.stringify({
                number: trackingNumber,
                carrier: 0  // Auto-detect carrier
            })
        });
        
        const data = await response.json();
        
        if (data.code === 0 && data.data?.accepted?.length > 0) {
            const trackInfo = data.data.accepted[0].track;
            const status = trackInfo?.status || 'unknown';
            
            // Map 17track statuses to our app's statuses
            let mappedStatus = 'unknown';
            switch (status) {
                case 'transit':
                case 'pickup':
                    mappedStatus = 'shipped';
                    break;
                case 'delivered':
                    mappedStatus = 'delivered';
                    break;
                case 'undelivered':
                case 'exception':
                    mappedStatus = 'pending';
                    break;
                default:
                    mappedStatus = 'unknown';
            }
            
            res.json({ 
                status: mappedStatus,
                rawStatus: status,
                carrier: trackInfo?.service || 'unknown'
            });
        } else {
            res.json({ status: 'unknown', error: 'No tracking data found' });
        }
        
    } catch (error) {
        console.error('17Track API error:', error);
        res.json({ status: 'unknown', error: error.message });
    }
}
