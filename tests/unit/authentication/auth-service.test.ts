import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { AuthService } from '../../../services/authentication-service/src/services/auth-service';
import { createTestContext, createTestUser, TestContext } from '../../utils/test-helpers';

describe('AuthService Unit Tests', () => {
    let context: TestContext;
    let authService: AuthService;

    beforeAll(async () => {
        context = await createTestContext();
        authService = new AuthService(context.db);
    });

    afterAll(async () => {
        await context.cleanup();
    });

    beforeEach(async () => {
        // Clean up before each test
        await context.db.query("DELETE FROM users WHERE email LIKE '%@example.com'");
    });

    describe('User Registration', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'newuser@example.com',
                password: 'SecurePassword123!',
                firstName: 'John',
                lastName: 'Doe',
            };

            const result = await authService.register(userData);

            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('token');
            expect(result.user.email).toBe(userData.email);
            expect(result.user.firstName).toBe(userData.firstName);
            expect(result.user.lastName).toBe(userData.lastName);
            expect(result.user).not.toHaveProperty('passwordHash');
        });

        it('should hash the password correctly', async () => {
            const userData = {
                email: 'hashtest@example.com',
                password: 'TestPassword123!',
            };

            await authService.register(userData);

            const user = await context.db.query(
                'SELECT password_hash FROM users WHERE email = $1',
                [userData.email]
            );

            expect(user.rows[0].password_hash).toBeDefined();
            expect(user.rows[0].password_hash).not.toBe(userData.password);

            const isValid = await bcrypt.compare(userData.password, user.rows[0].password_hash);
            expect(isValid).toBe(true);
        });

        it('should reject duplicate email registration', async () => {
            const userData = {
                email: 'duplicate@example.com',
                password: 'SecurePassword123!',
            };

            await authService.register(userData);

            await expect(authService.register(userData)).rejects.toThrow('User already exists');
        });

        it('should validate password strength', async () => {
            const weakPasswords = [
                'weak',
                '12345678',
                'password',
                'Password',
                'Password123',
            ];

            for (const password of weakPasswords) {
                await expect(
                    authService.register({
                        email: `test${Date.now()}@example.com`,
                        password,
                    })
                ).rejects.toThrow(/password/i);
            }
        });
    });

    describe('User Login', () => {
        it('should login with valid credentials', async () => {
            const userData = {
                email: 'logintest@example.com',
                password: 'ValidPassword123!',
            };

            await authService.register(userData);
            const result = await authService.login(userData.email, userData.password);

            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('token');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user.email).toBe(userData.email);
        });

        it('should reject invalid email', async () => {
            await expect(
                authService.login('nonexistent@example.com', 'password')
            ).rejects.toThrow('Invalid credentials');
        });

        it('should reject invalid password', async () => {
            const userData = {
                email: 'wrongpassword@example.com',
                password: 'CorrectPassword123!',
            };

            await authService.register(userData);

            await expect(
                authService.login(userData.email, 'WrongPassword123!')
            ).rejects.toThrow('Invalid credentials');
        });

        it('should generate valid JWT tokens', async () => {
            const userData = {
                email: 'jwttest@example.com',
                password: 'ValidPassword123!',
            };

            await authService.register(userData);
            const result = await authService.login(userData.email, userData.password);

            const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
            expect(decoded.userId).toBeDefined();
            expect(decoded.email).toBe(userData.email);
            expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
        });
    });

    describe('Token Validation', () => {
        it('should validate valid tokens', async () => {
            const userData = {
                email: 'tokentest@example.com',
                password: 'ValidPassword123!',
            };

            await authService.register(userData);
            const loginResult = await authService.login(userData.email, userData.password);

            const validationResult = await authService.validateToken(loginResult.token);
            expect(validationResult).toHaveProperty('user');
            expect(validationResult.user.email).toBe(userData.email);
        });

        it('should reject invalid tokens', async () => {
            const invalidToken = 'invalid.token.here';

            await expect(
                authService.validateToken(invalidToken)
            ).rejects.toThrow('Invalid token');
        });

        it('should reject expired tokens', async () => {
            const expiredToken = jwt.sign(
                { userId: 'test', email: 'test@example.com' },
                process.env.JWT_SECRET!,
                { expiresIn: '-1h' }
            );

            await expect(
                authService.validateToken(expiredToken)
            ).rejects.toThrow('Token expired');
        });
    });

    describe('Password Reset', () => {
        it('should generate password reset token', async () => {
            const userData = {
                email: 'resettest@example.com',
                password: 'ValidPassword123!',
            };

            await authService.register(userData);
            const resetToken = await authService.generatePasswordResetToken(userData.email);

            expect(resetToken).toBeDefined();
            expect(typeof resetToken).toBe('string');
            expect(resetToken.length).toBeGreaterThan(20);
        });

        it('should reset password with valid token', async () => {
            const userData = {
                email: 'resetpassword@example.com',
                password: 'OldPassword123!',
            };

            await authService.register(userData);
            const resetToken = await authService.generatePasswordResetToken(userData.email);
            const newPassword = 'NewPassword123!';

            await authService.resetPassword(resetToken, newPassword);

            // Should be able to login with new password
            const loginResult = await authService.login(userData.email, newPassword);
            expect(loginResult).toHaveProperty('token');

            // Should not be able to login with old password
            await expect(
                authService.login(userData.email, userData.password)
            ).rejects.toThrow('Invalid credentials');
        });
    });

    describe('User Profile Management', () => {
        it('should update user profile', async () => {
            const userData = {
                email: 'profiletest@example.com',
                password: 'ValidPassword123!',
                firstName: 'John',
                lastName: 'Doe',
            };

            const registerResult = await authService.register(userData);
            const userId = registerResult.user.id;

            const updateData = {
                firstName: 'Jane',
                lastName: 'Smith',
                phone: '+1234567890',
            };

            const updatedUser = await authService.updateProfile(userId, updateData);

            expect(updatedUser.firstName).toBe(updateData.firstName);
            expect(updatedUser.lastName).toBe(updateData.lastName);
            expect(updatedUser.phone).toBe(updateData.phone);
            expect(updatedUser.email).toBe(userData.email); // Should not change
        });

        it('should get user by ID', async () => {
            const userData = {
                email: 'getuser@example.com',
                password: 'ValidPassword123!',
            };

            const registerResult = await authService.register(userData);
            const userId = registerResult.user.id;

            const user = await authService.getUserById(userId);

            expect(user).toBeDefined();
            expect(user.id).toBe(userId);
            expect(user.email).toBe(userData.email);
            expect(user).not.toHaveProperty('passwordHash');
        });
    });
});