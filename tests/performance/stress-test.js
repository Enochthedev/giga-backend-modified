import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Stress test configuration - gradually increase load to find breaking point
export const options = {
    stages: [
        { duration: '1m', target: 10 },   // Warm up
        { duration: '2m', target: 50 },   // Ramp up to normal load
        { duration: '2m', target: 100 },  // Increase load
        { duration: '2m', target: 200 },  // High load
        { duration: '2m', target: 300 },  // Very high load
        { duration: '2m', target: 400 },  // Extreme load
        { duration: '5m', target: 400 },  // Stay at extreme load
        { duration: '2m', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
        http_req_failed: ['rate<0.2'],     // Error rate must be below 20% (higher threshold for stress test)
        errors: ['rate<0.2'],              // Custom error rate must be below 20%
    },
};

const BASE_URL = __ENV.API_GATEWAY_URL || 'http://localhost:3000';

export function setup() {
    console.log('Setting up stress test...');

    // Create a test user for authenticated requests
    const testUser = {
        email: `stresstest${Date.now()}@example.com`,
        password: 'StressTest123!',
    };

    const registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(testUser), {
        headers: { 'Content-Type': 'application/json' },
    });

    if (registerResponse.status === 201) {
        const registerData = JSON.parse(registerResponse.body);
        return { authToken: registerData.token, testUser };
    }

    return { authToken: null, testUser };
}

export default function (data) {
    // Simulate different user behaviors under stress
    const scenarios = [
        () => heavyReadOperations(),
        () => heavyWriteOperations(data.authToken),
        () => mixedOperations(data.authToken),
        () => searchOperations(),
    ];

    // Randomly select a scenario
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    scenario();

    // Shorter sleep time to increase load
    sleep(Math.random() * 0.5);
}

function heavyReadOperations() {
    // Simulate heavy read load
    const endpoints = [
        '/api/ecommerce/products',
        '/api/ecommerce/categories',
        '/api/hotel/properties',
        '/api/taxi/drivers/nearby',
        '/health',
    ];

    for (let i = 0; i < 5; i++) {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const response = http.get(`${BASE_URL}${endpoint}`);

        const success = check(response, {
            [`${endpoint} status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
            [`${endpoint} response time < 2s`]: (r) => r.timings.duration < 2000,
        });

        errorRate.add(!success);

        if (!success) {
            console.log(`Failed request to ${endpoint}: ${response.status}`);
        }
    }
}

function heavyWriteOperations(token) {
    if (!token) return;

    // Simulate heavy write load
    const operations = [
        () => {
            // Add to cart
            const response = http.post(`${BASE_URL}/api/ecommerce/cart/add`, JSON.stringify({
                productId: `stress-product-${Math.floor(Math.random() * 100)}`,
                quantity: Math.floor(Math.random() * 5) + 1,
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            return check(response, {
                'cart add status is 2xx': (r) => r.status >= 200 && r.status < 300,
            });
        },
        () => {
            // Update profile
            const response = http.put(`${BASE_URL}/api/auth/profile`, JSON.stringify({
                firstName: `Stress${Math.floor(Math.random() * 1000)}`,
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            return check(response, {
                'profile update status is 2xx': (r) => r.status >= 200 && r.status < 300,
            });
        },
    ];

    for (let i = 0; i < 3; i++) {
        const operation = operations[Math.floor(Math.random() * operations.length)];
        const success = operation();
        errorRate.add(!success);
    }
}

function mixedOperations(token) {
    // Mix of read and write operations
    const operations = [
        () => http.get(`${BASE_URL}/api/ecommerce/products`),
        () => http.get(`${BASE_URL}/api/hotel/properties`),
        () => http.get(`${BASE_URL}/health`),
    ];

    if (token) {
        operations.push(
            () => http.get(`${BASE_URL}/api/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` },
            }),
            () => http.get(`${BASE_URL}/api/ecommerce/cart`, {
                headers: { 'Authorization': `Bearer ${token}` },
            })
        );
    }

    for (let i = 0; i < 4; i++) {
        const operation = operations[Math.floor(Math.random() * operations.length)];
        const response = operation();

        const success = check(response, {
            'mixed operation status is 2xx': (r) => r.status >= 200 && r.status < 300,
            'mixed operation response time < 3s': (r) => r.timings.duration < 3000,
        });

        errorRate.add(!success);
    }
}

function searchOperations() {
    // Heavy search load
    const searchTerms = [
        'laptop', 'phone', 'book', 'shoes', 'watch',
        'hotel', 'restaurant', 'taxi', 'car', 'bike',
    ];

    for (let i = 0; i < 3; i++) {
        const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const response = http.get(`${BASE_URL}/api/search?q=${term}&limit=20`);

        const success = check(response, {
            'search status is 2xx': (r) => r.status >= 200 && r.status < 300,
            'search response time < 5s': (r) => r.timings.duration < 5000,
        });

        errorRate.add(!success);
    }
}

export function teardown(data) {
    console.log('Stress test completed');

    // Log final statistics
    console.log('Test completed. Check the results for system breaking points.');
}