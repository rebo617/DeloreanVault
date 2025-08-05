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
        console.log('Register response:', JSON.stringify(registerData, null, 2));
        
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
        
        // Debug: Log the raw response
        console.log('17Track query response:', JSON.stringify(queryData, null, 2));
        
        if (queryData.code === 0 && queryData.data?.accepted?.length > 0) {
            const trackInfo = queryData.data.accepted[0];
            const track = trackInfo.track;
            
            if (!track) {
                return res.json({ 
                    status: 'unknown', 
                    error: 'No tracking information available yet',
                    trackingNumber: trackingNumber,
                    registered: true
                });
            }
            
            // Map 17track statuses to our app's statuses
            let mappedStatus = 'unknown';
            let statusText = 'Unknown';
            
            // Check the latest event status
            const latestEvent = track.z0?.[0]; // Most recent tracking event
            const generalStatus = track.e; // General status code
            
            // Status mapping based on 17track documentation
            switch (generalStatus) {
                case 10: // Information received
                case 20: // In transit
                case 30: // Out for delivery
                    mappedStatus = 'shipped';
                    statusText = 'In Transit';
                    break;
                case 40: // Delivered
                    mappedStatus = 'delivered';
                    statusText = 'Delivered';
                    break;
                case 50: // Exception/Problem
                    mappedStatus = 'pending';
                    statusText = 'Exception';
                    break;
                default:
                    mappedStatus = 'pending';
                    statusText = 'Pending';
            }
            
            // If we have tracking events, use the latest one for more detail
            if (latestEvent) {
                const eventStatus = latestEvent.z;
                switch (eventStatus) {
                    case 'Delivered':
                    case 'delivered':
                        mappedStatus = 'delivered';
                        statusText = 'Delivered';
                        break;
                    case 'Out for delivery':
                    case 'In transit':
                        mappedStatus = 'shipped';
                        statusText = 'In Transit';
                        break;
                }
            }
            
            res.json({ 
                status: mappedStatus,
                statusText: statusText,
                rawStatus: generalStatus,
                carrier: track.w || 'Unknown',
                carrierCode: carrierCode,
                lastUpdate: latestEvent?.a || null,
                location: latestEvent?.c || null,
                events: track.z0 || [],
                debug: {
                    generalStatus: generalStatus,
                    latestEvent: latestEvent,
                    fullTrack: track
                }
            });
        } else if (queryData.code === 0 && queryData.data?.rejected?.length > 0) {
            const rejection = queryData.data.rejected[0];
            res.json({ 
                status: 'unknown', 
                error: `Tracking rejected: ${rejection.error?.message || 'Invalid tracking number'}`,
                trackingNumber: trackingNumber
            });
        } else {
            // Return detailed error info
            res.json({ 
                status: 'unknown', 
                error: 'No tracking data found or API error',
                apiResponse: queryData,
                carrierCode: carrierCode,
                trackingNumber: trackingNumber
            });
        }
        
    } catch (error) {
        console.error('17Track API error:', error);
        res.json({ 
            status: 'unknown', 
            error: error.message,
            carrierCode: carrierCode,
            trackingNumber: trackingNumber
        });
    }
}
