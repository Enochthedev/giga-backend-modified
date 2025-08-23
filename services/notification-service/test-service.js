const http = require('http');

// Simple health check test
const options = {
    hostname: 'localhost',
    port: 3006,
    path: '/health',
    method: 'GET'
};

console.log('Testing notification service health endpoint...');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);

    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`Body: ${chunk}`);
    });

    res.on('end', () => {
        console.log('Health check completed');
        if (res.statusCode === 200) {
            console.log('✅ Notification service is healthy');
        } else {
            console.log('❌ Notification service health check failed');
        }
    });
});

req.on('error', (e) => {
    console.error(`❌ Health check failed: ${e.message}`);
    console.log('Make sure the notification service is running on port 3006');
});

req.end();