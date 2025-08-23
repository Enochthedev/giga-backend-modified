#!/usr/bin/env node

/**
 * Simple test script to verify the payment service is working
 * Run with: node test-service.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:4002';

function makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testService() {
    console.log('🧪 Testing Payment Service...\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing health check...');
        const health = await makeRequest('/health');
        console.log(`   Status: ${health.status}`);
        console.log(`   Response: ${JSON.stringify(health.data, null, 2)}\n`);

        // Test 2: API Documentation
        console.log('2. Testing API documentation...');
        const docs = await makeRequest('/docs/');
        console.log(`   Status: ${docs.status}`);
        console.log(`   Documentation available: ${docs.status === 200 ? '✅' : '❌'}\n`);

        // Test 3: Unauthorized request (should fail)
        console.log('3. Testing unauthorized request...');
        const unauthorized = await makeRequest('/payments');
        console.log(`   Status: ${unauthorized.status}`);
        console.log(`   Expected 401: ${unauthorized.status === 401 ? '✅' : '❌'}\n`);

        // Test 4: Invalid endpoint (should return 404)
        console.log('4. Testing invalid endpoint...');
        const notFound = await makeRequest('/invalid-endpoint');
        console.log(`   Status: ${notFound.status}`);
        console.log(`   Expected 404: ${notFound.status === 404 ? '✅' : '❌'}\n`);

        console.log('✅ Basic service tests completed!');
        console.log('\n📚 To test authenticated endpoints:');
        console.log('   1. Set up JWT_SECRET in environment');
        console.log('   2. Generate a valid JWT token');
        console.log('   3. Include Authorization header in requests');
        console.log('\n🔗 API Documentation: http://localhost:4002/docs');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 Make sure the payment service is running on port 4002');
        console.log('   Start with: npm start');
    }
}

// Run tests
testService();