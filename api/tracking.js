export default async function handler(req, res) {
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
        // Register the tracking number
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
        
        if (!registerResponse.ok) {
            throw new Error(`Register failed: ${registerResponse.status}`);
        }
        
        // Get tracking info
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
        
        if (!queryResponse.ok) {
            throw new Error(`Query failed: ${queryResponse.status}`);
        }
        
        const queryData = await queryResponse.json();
        
        if (queryData.code === 0 && queryData.data?.accepted?.length > 0) {
            const trackInfo = queryData.data.accepted[0];
            const track = trackInfo.track;
            
            if (!track || !track.e) {
                return res.json({ 
                    status: 'pending', 
                    statusText: 'Registered - awaiting updates',
                    trackingNumber: trackingNumber
                });
            }
            
            let mappedStatus = 'pending';
            let statusText = 'Pending';
            
            const generalStatus = track.e;
            
            switch (generalStatus) {
                case 10:
                case 20:
                case 30:
                    mappedStatus = 'shipped';
                    statusText = 'In Transit';
                    break;
                case 40:
                    mappedStatus = 'delivered';
                    statusText = 'Delivered';
                    break;
                case 50:
                    mappedStatus = 'pending';
                    statusText = 'Exception';
                    break;
                default:
                    mappedStatus = 'pending';
                    statusText = 'Registered';
            }
            
            return res.json({ 
                status: mappedStatus,
                statusText: statusText,
                carrier: track.w || 'Auto-detected',
                trackingNumber: trackingNumber
            });
        } else {
            return res.json({ 
                status: 'pending', 
                statusText: 'Registered - no updates yet',
                trackingNumber: trackingNumber
            });
        }
        
    } catch (error) {
        return res.json({ 
            status: 'unknown', 
            statusText: 'Connection error',
            error: error.message,
            trackingNumber: trackingNumber
        });
    }
}
