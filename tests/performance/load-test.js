import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
    stages: [
        { duration: '2m', target: 10 }, // Ramp up to 10 users
        { duration: '5m', target: 10 }, // Stay at 10 users
        { duration: '2m', target: 20 }, // Ramp up to 20 users
        { duration: '5m', target: 20 }, // Stay at 20 users
        { duration: '2m', target: 0 },  // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
        http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
        errors: ['rate<0.1'],             // Custom error rate must be below 10%
    },
};

const BASE_URL = __ENV.API_GATEWAY_URL || 'http://localhost:3000';

// Test data
const testUsers = [
    { email: 'loadtest1@example.com', password: 'LoadTest123!' },
    { email: 'loadtest2@example.com', password: 'LoadTest123!' },
    { email: 'loadtest3@example.com', password: 'LoadTest123!' },
];

let authToken = '';

export function setup() {
    // Setup phase - create test users and get auth tokens
    console.log('Setting up load test...');

    // Register test users
    for (const user of testUsers) {
        const registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(user), {
            headers: { 'Content-Type': 'application/json' },
        });

        if (registerResponse.status !== 201 && registerResponse.status !== 409) {
            console.error(`Failed to register user ${user.email}: ${registerResponse.status}`);
        }
    }

    // Login and get token for authenticated requests
    const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(testUsers[0]), {
        headers: { 'Content-Type': 'application/json' },
    });

    if (loginResponse.status === 200) {
        const loginData = JSON.parse(loginResponse.body);
        authToken = loginData.token;
    }

    return { authToken };
}

export default function (data) {
    const token = data.authToken || authToken;

    // Test scenario: Mixed API load
    testHealthEndpoints();
    testAuthenticationFlow();
    testEcommerceFlow(token);
    testPaymentFlow(token);

    sleep(1); // Wait 1 second between iterations
}

function testHealthEndpoints() {
    const response = http.get(`${BASE_URL}/health`);

    const success = check(response, {
        'health check status is 200': (r) => r.status === 200,
        'health check response time < 100ms': (r) => r.timings.duration < 100,
    });

    errorRate.add(!success);
}

function testAuthenticationFlow() {
    // Test login endpoint
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];
    const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(user), {
        headers: { 'Content-Type': 'application/json' },
    });

    const loginSuccess = check(loginResponse, {
        'login status is 200': (r) => r.status === 200,
        'login response time < 300ms': (r) => r.timings.duration < 300,
        'login returns token': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.token !== undefined;
            } catch (e) {
                return false;
            }
        },
    });

    errorRate.add(!loginSuccess);

    // Test token validation if login was successful
    if (loginResponse.status === 200) {
        try {
            const loginData = JSON.parse(loginResponse.body);
            const validateResponse = http.get(`${BASE_URL}/api/auth/validate`, {
                headers: { 'Authorization': `Bearer ${loginData.token}` },
            });

            const validateSuccess = check(validateResponse, {
                'token validation status is 200': (r) => r.status === 200,
                'token validation response time < 200ms': (r) => r.timings.duration < 200,
            });

            errorRate.add(!validateSuccess);
        } catch (e) {
            errorRate.add(true);
        }
    }
}

function testEcommerceFlow(token) {
    // Test product listing
    const productsResponse = http.get(`${BASE_URL}/api/ecommerce/products`);

    const productsSuccess = check(productsResponse, {
        'products listing status is 200': (r) => r.status === 200,
        'products listing response time < 400ms': (r) => r.timings.duration < 400,
        'products listing returns array': (r) => {
            try {
                const body = JSON.parse(r.body);
                return Array.isArray(body.products);
            } catch (e) {
                return false;
            }
        },
    });

    errorRate.add(!productsSuccess);

    // Test product search
    const searchResponse = http.get(`${BASE_URL}/api/ecommerce/products/search?q=test`);

    const searchSuccess = check(searchResponse, {
        'product search status is 200': (r) => r.status === 200,
        'product search response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(!searchSuccess);

    // Test cart operations (if authenticated)
    if (token) {
        const cartResponse = http.get(`${BASE_URL}/api/ecommerce/cart`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        const cartSuccess = check(cartResponse, {
            'cart retrieval status is 200': (r) => r.status === 200,
            'cart retrieval response time < 300ms': (r) => r.timings.duration < 300,
        });

        errorRate.add(!cartSuccess);
    }
}

function testPaymentFlow(token) {
    if (!token) return;

    // Test payment methods retrieval
    const paymentMethodsResponse = http.get(`${BASE_URL}/api/payments/methods`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const paymentMethodsSuccess = check(paymentMethodsResponse, {
        'payment methods status is 200': (r) => r.status === 200,
        'payment methods response time < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(!paymentMethodsSuccess);

    // Test payment history
    const historyResponse = http.get(`${BASE_URL}/api/payments/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const historySuccess = check(historyResponse, {
        'payment history status is 200': (r) => r.status === 200,
        'payment history response time < 400ms': (r) => r.timings.duration < 400,
    });

    errorRate.add(!historySuccess);
}

export function teardown(data) {
    // Cleanup phase
    console.log('Cleaning up load test...');

    // In a real scenario, you might want to clean up test data
    // For now, just log the completion
    console.log('Load test completed');
}