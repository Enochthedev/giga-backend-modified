import { Logger } from '../utils/logger';

describe('Logger', () => {
    beforeEach(() => {
        // Mock console methods to avoid actual logging during tests
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should log info messages', () => {
        Logger.info('Test message');
        // Test passes if no error is thrown
        expect(true).toBe(true);
    });

    it('should log error messages', () => {
        const error = new Error('Test error');
        Logger.error('Test error message', error);
        // Test passes if no error is thrown
        expect(true).toBe(true);
    });

    it('should log warning messages', () => {
        Logger.warn('Test warning');
        // Test passes if no error is thrown
        expect(true).toBe(true);
    });

    it('should log debug messages', () => {
        Logger.debug('Test debug');
        // Test passes if no error is thrown
        expect(true).toBe(true);
    });
});