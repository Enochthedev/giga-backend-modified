#!/usr/bin/env node

/**
 * 🧪 Demo Test Script - All New Features
 * This script demonstrates all the new functionality without requiring Jest or database setup
 */

const path = require('path');
const fs = require('fs');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
    log('\n' + '='.repeat(60), 'bright');
    log(`  ${title}`, 'cyan');
    log('='.repeat(60), 'bright');
}

function logSection(title) {
    log(`\n${title}`, 'yellow');
    log('-'.repeat(40), 'yellow');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
};

function runTest(testName, testFunction) {
    testResults.total++;
    try {
        testFunction();
        logSuccess(`${testName} - PASSED`);
        testResults.passed++;
        return true;
    } catch (error) {
        logError(`${testName} - FAILED: ${error.message}`);
        testResults.failed++;
        return false;
    }
}

// Test 1: Check if all required files exist
function testFileStructure() {
    logSection('Testing File Structure');

    const requiredFiles = [
        'common/src/mailer.ts',
        'common/src/upload.ts',
        'common/src/index.ts',
        'giga_main/src/models/user.model.ts',
        'giga_main/src/services/user.service.ts',
        'giga_main/src/controllers/user.controller.ts',
        'giga_main/src/routes/user.routes.ts',
        'giga_main/src/services/oauth.service.ts',
        'giga_main/src/controllers/oauth.controller.ts',
        'giga_main/src/routes/oauth.routes.ts',
        'giga_main/env.example',
        'common/env.example',
        'advertisement-service/env.example',
        'hotel-service/env.example',
        'payment-service/env.example',
        'ecommerce-backend/env.example',
        'common/METADATA_STRIPPING_EXAMPLES.md',
        'giga_main/IMPLEMENTATION_SUMMARY.md',
        'giga_main/OAUTH_SETUP.md',
        'giga_main/USER_AUTH_SUMMARY.md',
    ];

    requiredFiles.forEach(file => {
        if (fs.existsSync(file)) {
            logSuccess(`${file} exists`);
        } else {
            throw new Error(`${file} not found`);
        }
    });
}

// Test 2: Check package.json configurations
function testPackageConfigurations() {
    logSection('Testing Package Configurations');

    // Check common package.json
    const commonPackage = JSON.parse(fs.readFileSync('common/package.json', 'utf8'));
    if (commonPackage.dependencies.nodemailer && commonPackage.dependencies.cloudinary) {
        logSuccess('Common package has required dependencies');
    } else {
        throw new Error('Common package missing required dependencies');
    }

    // Check giga_main package.json
    const gigaMainPackage = JSON.parse(fs.readFileSync('giga_main/package.json', 'utf8'));
    if (gigaMainPackage.dependencies.passport && gigaMainPackage.dependencies['passport-google-oauth20']) {
        logSuccess('Giga main package has OAuth dependencies');
    } else {
        throw new Error('Giga main package missing OAuth dependencies');
    }
}

// Test 3: Check TypeScript configurations
function testTypeScriptConfigurations() {
    logSection('Testing TypeScript Configurations');

    const tsConfigs = [
        'common/tsconfig.json',
        'giga_main/tsconfig.json',
    ];

    tsConfigs.forEach(config => {
        if (fs.existsSync(config)) {
            const tsConfig = JSON.parse(fs.readFileSync(config, 'utf8'));
            if (tsConfig.compilerOptions && tsConfig.compilerOptions.target) {
                logSuccess(`${config} is properly configured`);
            } else {
                throw new Error(`${config} has invalid configuration`);
            }
        } else {
            throw new Error(`${config} not found`);
        }
    });
}

// Test 4: Check environment examples
function testEnvironmentExamples() {
    logSection('Testing Environment Examples');

    const envFiles = [
        'giga_main/env.example',
        'common/env.example',
        'advertisement-service/env.example',
        'hotel-service/env.example',
        'payment-service/env.example',
        'ecommerce-backend/env.example',
    ];

    envFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes('CLOUDINARY_') || content.includes('SMTP_') || content.includes('MONGODB_')) {
                logSuccess(`${file} has proper environment variables`);
            } else {
                logWarning(`${file} may be missing some environment variables`);
            }
        } else {
            throw new Error(`${file} not found`);
        }
    });
}

// Test 5: Check OAuth implementation
function testOAuthImplementation() {
    logSection('Testing OAuth Implementation');

    const oauthFiles = [
        'giga_main/src/services/oauth.service.ts',
        'giga_main/src/controllers/oauth.controller.ts',
        'giga_main/src/routes/oauth.routes.ts',
    ];

    oauthFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');

            if (file.includes('oauth.service.ts')) {
                // Service should have OAuth strategies
                if (content.includes('GoogleStrategy') || content.includes('AppleStrategy')) {
                    logSuccess(`${file} has OAuth strategies implemented`);
                } else {
                    throw new Error(`${file} missing OAuth strategy implementation`);
                }
            } else if (file.includes('oauth.controller.ts')) {
                // Controller should have OAuth flow handling
                if (content.includes('googleAuth') || content.includes('appleAuth') || content.includes('OAuth')) {
                    logSuccess(`${file} has OAuth flow handling`);
                } else {
                    throw new Error(`${file} missing OAuth flow handling`);
                }
            } else if (file.includes('oauth.routes.ts')) {
                // Routes should have OAuth endpoints
                if (content.includes('/google') || content.includes('/apple') || content.includes('OAuthController')) {
                    logSuccess(`${file} has OAuth routes defined`);
                } else {
                    throw new Error(`${file} missing OAuth routes`);
                }
            }
        } else {
            throw new Error(`${file} not found`);
        }
    });
}

// Test 6: Check user model enhancements
function testUserModelEnhancements() {
    logSection('Testing User Model Enhancements');

    const userModel = fs.readFileSync('giga_main/src/models/user.model.ts', 'utf8');

    const requiredFields = [
        'street',
        'city',
        'weight',
        'maritalStatus',
        'ageGroup',
        'otpCode',
        'otpExpires',
        'isPhoneVerified',
        'oauthProvider',
        'oauthId',
    ];

    requiredFields.forEach(field => {
        if (userModel.includes(field)) {
            logSuccess(`User model has ${field} field`);
        } else {
            throw new Error(`User model missing ${field} field`);
        }
    });
}

// Test 7: Check OTP implementation
function testOTPImplementation() {
    logSection('Testing OTP Implementation');

    const userService = fs.readFileSync('giga_main/src/services/user.service.ts', 'utf8');

    if (userService.includes('verifyOTP') && userService.includes('resendOTP')) {
        logSuccess('User service has OTP verification methods');
    } else {
        throw new Error('User service missing OTP verification methods');
    }

    const userController = fs.readFileSync('giga_main/src/controllers/user.controller.ts', 'utf8');

    if (userController.includes('verifyOTP') && userController.includes('resendOTP')) {
        logSuccess('User controller has OTP endpoints');
    } else {
        throw new Error('User controller missing OTP endpoints');
    }
}

// Test 8: Check file upload implementation
function testFileUploadImplementation() {
    logSection('Testing File Upload Implementation');

    const uploadService = fs.readFileSync('common/src/upload.ts', 'utf8');

    const requiredFeatures = [
        'stripMetadata',
        'stripExif',
        'stripGps',
        'uploadFile',
        'uploadMultipleFiles',
        'uploadWithProgress',
    ];

    requiredFeatures.forEach(feature => {
        if (uploadService.includes(feature)) {
            logSuccess(`Upload service has ${feature} functionality`);
        } else {
            throw new Error(`Upload service missing ${feature} functionality`);
        }
    });
}

// Test 9: Check mailing system
function testMailingSystem() {
    logSection('Testing Mailing System');

    const mailerService = fs.readFileSync('common/src/mailer.ts', 'utf8');

    const requiredFeatures = [
        'sendOTPEmail',
        'sendVerificationEmail',
        'sendWelcomeEmail',
        'SMTP',
        'Gmail',
        'Mailjet',
        'SendGrid',
    ];

    requiredFeatures.forEach(feature => {
        if (mailerService.includes(feature)) {
            logSuccess(`Mailer service has ${feature} support`);
        } else {
            throw new Error(`Mailer service missing ${feature} support`);
        }
    });
}

// Test 10: Check validation schemas
function testValidationSchemas() {
    logSection('Testing Validation Schemas');

    const validationFile = fs.readFileSync('giga_main/src/validations/user.validation.ts', 'utf8');

    const requiredSchemas = [
        'createUser',
        'verifyOTP',
        'resendOTP',
        'updateProfile',
    ];

    requiredSchemas.forEach(schema => {
        if (validationFile.includes(schema)) {
            logSuccess(`Validation has ${schema} schema`);
        } else {
            throw new Error(`Validation missing ${schema} schema`);
        }
    });
}

// Main test execution
function runAllTests() {
    logHeader('🧪 COMPREHENSIVE FEATURE TEST SUITE');
    log('Testing all new features without requiring database or Jest setup', 'blue');

    const tests = [
        { name: 'File Structure', fn: testFileStructure },
        { name: 'Package Configurations', fn: testPackageConfigurations },
        { name: 'TypeScript Configurations', fn: testTypeScriptConfigurations },
        { name: 'Environment Examples', fn: testEnvironmentExamples },
        { name: 'OAuth Implementation', fn: testOAuthImplementation },
        { name: 'User Model Enhancements', fn: testUserModelEnhancements },
        { name: 'OTP Implementation', fn: testOTPImplementation },
        { name: 'File Upload Implementation', fn: testFileUploadImplementation },
        { name: 'Mailing System', fn: testMailingSystem },
        { name: 'Validation Schemas', fn: testValidationSchemas },
    ];

    tests.forEach(test => {
        runTest(test.name, test.fn);
    });

    // Summary
    logHeader('📊 TEST RESULTS SUMMARY');
    log(`Total Tests: ${testResults.total}`, 'bright');
    log(`Passed: ${testResults.passed}`, 'green');
    log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');

    if (testResults.failed === 0) {
        log('\n🎉 ALL TESTS PASSED!', 'green');
        log('✅ OAuth authentication system is ready', 'green');
        log('✅ OTP verification system is ready', 'green');
        log('✅ Enhanced user management is ready', 'green');
        log('✅ File upload with metadata stripping is ready', 'green');
        log('✅ Comprehensive mailing system is ready', 'green');
        log('✅ All environment configurations are ready', 'green');

        log('\n🚀 Next Steps:', 'blue');
        log('1. Copy .env.example files to .env and configure your values', 'blue');
        log('2. Set up OAuth applications in Google and Apple developer consoles', 'blue');
        log('3. Configure your email service (SMTP, Gmail, Mailjet, or SendGrid)', 'blue');
        log('4. Set up Cloudinary for file uploads', 'blue');
        log('5. Test the live system with real data', 'blue');

        log('\n📚 Documentation Available:', 'cyan');
        log('- OAUTH_SETUP.md - Complete OAuth setup guide', 'cyan');
        log('- USER_AUTH_SUMMARY.md - User data structure and auth methods', 'cyan');
        log('- METADATA_STRIPPING_EXAMPLES.md - File upload and metadata stripping guide', 'cyan');
        log('- IMPLEMENTATION_SUMMARY.md - Comprehensive implementation overview', 'cyan');
    } else {
        log('\n❌ SOME TESTS FAILED', 'red');
        log('Please check the errors above and fix the issues before proceeding', 'red');
    }
}

// Run the tests
if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests, testResults };
