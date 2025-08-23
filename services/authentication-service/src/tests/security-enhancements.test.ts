import { MfaService } from '../services/mfa-service';
import { DeviceManagementService } from '../services/device-management-service';
import { FraudDetectionService } from '../services/fraud-detection-service';
import { SecurityAuditService } from '../services/security-audit-service';
import { OAuthService } from '../services/oauth-service';

describe('Security Enhancements', () => {
    describe('MfaService', () => {
        it('should be defined', () => {
            expect(MfaService).toBeDefined();
        });

        it('should have required methods', () => {
            expect(typeof MfaService.setupTotp).toBe('function');
            expect(typeof MfaService.verifyAndEnableTotp).toBe('function');
            expect(typeof MfaService.verifyTotp).toBe('function');
            expect(typeof MfaService.disableTotp).toBe('function');
            expect(typeof MfaService.getMfaStatus).toBe('function');
        });
    });

    describe('DeviceManagementService', () => {
        it('should be defined', () => {
            expect(DeviceManagementService).toBeDefined();
        });

        it('should have required methods', () => {
            expect(typeof DeviceManagementService.generateDeviceFingerprint).toBe('function');
            expect(typeof DeviceManagementService.parseDeviceInfo).toBe('function');
            expect(typeof DeviceManagementService.registerDevice).toBe('function');
            expect(typeof DeviceManagementService.getUserDevices).toBe('function');
        });

        it('should generate device fingerprint', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
            const ipAddress = '192.168.1.1';

            const fingerprint = DeviceManagementService.generateDeviceFingerprint(userAgent, ipAddress);

            expect(fingerprint).toBeDefined();
            expect(typeof fingerprint).toBe('string');
            expect(fingerprint.length).toBe(64); // SHA-256 hex string
        });

        it('should parse device info', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
            const ipAddress = '192.168.1.1';

            const deviceInfo = DeviceManagementService.parseDeviceInfo(userAgent, ipAddress);

            expect(deviceInfo).toBeDefined();
            expect(deviceInfo.deviceId).toBeDefined();
            expect(deviceInfo.deviceType).toBeDefined();
            expect(deviceInfo.browser).toBeDefined();
            expect(deviceInfo.os).toBeDefined();
            expect(deviceInfo.ipAddress).toBe(ipAddress);
        });
    });

    describe('FraudDetectionService', () => {
        it('should be defined', () => {
            expect(FraudDetectionService).toBeDefined();
        });

        it('should have required methods', () => {
            expect(typeof FraudDetectionService.analyzeLoginAttempt).toBe('function');
            expect(typeof FraudDetectionService.logLoginAttempt).toBe('function');
            expect(typeof FraudDetectionService.shouldLockAccount).toBe('function');
            expect(typeof FraudDetectionService.lockAccount).toBe('function');
        });
    });

    describe('SecurityAuditService', () => {
        it('should be defined', () => {
            expect(SecurityAuditService).toBeDefined();
        });

        it('should have required methods', () => {
            expect(typeof SecurityAuditService.logEvent).toBe('function');
            expect(typeof SecurityAuditService.getUserAuditLogs).toBe('function');
            expect(typeof SecurityAuditService.getSystemAuditLogs).toBe('function');
            expect(typeof SecurityAuditService.getSecurityStats).toBe('function');
        });

        it('should parse device info from user agent', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

            const deviceInfo = SecurityAuditService.parseDeviceInfo(userAgent);

            expect(deviceInfo).toBeDefined();
            expect(deviceInfo.browser).toBeDefined();
            expect(deviceInfo.os).toBeDefined();
            expect(deviceInfo.device).toBeDefined();
        });
    });

    describe('OAuthService', () => {
        it('should be defined', () => {
            expect(OAuthService).toBeDefined();
        });

        it('should have required methods', () => {
            expect(typeof OAuthService.initialize).toBe('function');
            expect(typeof OAuthService.handleOAuthLogin).toBe('function');
            expect(typeof OAuthService.linkProvider).toBe('function');
            expect(typeof OAuthService.unlinkProvider).toBe('function');
            expect(typeof OAuthService.getUserProviders).toBe('function');
        });
    });
});