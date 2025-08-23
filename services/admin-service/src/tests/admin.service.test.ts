import { AdminService } from '../services/admin.service';
import { AdminDatabase } from '../database/connection';
import { CreateAdminUserRequest, LoginRequest } from '../types/admin.types';
import bcrypt from 'bcryptjs';

describe('AdminService', () => {
    let testAdminId: string;
    let testRoleId: string;

    beforeAll(async () => {
        // Create test role
        const roleResult = await AdminDatabase.query(`
            INSERT INTO admin_roles (name, description, permissions)
            VALUES ('test_role', 'Test role', '["users:read", "users:write"]')
            RETURNING id
        `);
        testRoleId = roleResult.rows[0].id;
    });

    afterAll(async () => {
        // Clean up test data
        if (testAdminId) {
            await AdminDatabase.query('DELETE FROM admin_users WHERE id = $1', [testAdminId]);
        }
        if (testRoleId) {
            await AdminDatabase.query('DELETE FROM admin_roles WHERE id = $1', [testRoleId]);
        }
    });

    describe('createAdminUser', () => {
        it('should create a new admin user successfully', async () => {
            const adminData: CreateAdminUserRequest = {
                email: 'test@example.com',
                password: 'testpassword123',
                firstName: 'Test',
                lastName: 'User',
                phone: '+1234567890',
                roleId: testRoleId
            };

            const createdAdmin = await AdminService.createAdminUser(adminData, 'system');
            testAdminId = createdAdmin.id;

            expect(createdAdmin).toBeDefined();
            expect(createdAdmin.email).toBe(adminData.email);
            expect(createdAdmin.firstName).toBe(adminData.firstName);
            expect(createdAdmin.lastName).toBe(adminData.lastName);
            expect(createdAdmin.phone).toBe(adminData.phone);
            expect(createdAdmin.roleId).toBe(adminData.roleId);
            expect(createdAdmin.status).toBe('active');
        });

        it('should throw error for duplicate email', async () => {
            const adminData: CreateAdminUserRequest = {
                email: 'test@example.com', // Same email as above
                password: 'testpassword123',
                firstName: 'Test2',
                lastName: 'User2',
                roleId: testRoleId
            };

            await expect(AdminService.createAdminUser(adminData, 'system'))
                .rejects.toThrow('Email already exists');
        });

        it('should throw error for invalid role ID', async () => {
            const adminData: CreateAdminUserRequest = {
                email: 'test2@example.com',
                password: 'testpassword123',
                firstName: 'Test2',
                lastName: 'User2',
                roleId: 'invalid-role-id'
            };

            await expect(AdminService.createAdminUser(adminData, 'system'))
                .rejects.toThrow('Invalid role ID');
        });
    });

    describe('login', () => {
        it('should login successfully with correct credentials', async () => {
            const loginData: LoginRequest = {
                email: 'test@example.com',
                password: 'testpassword123'
            };

            const result = await AdminService.login(loginData, '127.0.0.1', 'test-agent');

            expect(result.success).toBe(true);
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.user.email).toBe(loginData.email);
            expect(result.expiresAt).toBeDefined();
        });

        it('should fail login with incorrect password', async () => {
            const loginData: LoginRequest = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            await expect(AdminService.login(loginData, '127.0.0.1', 'test-agent'))
                .rejects.toThrow('Invalid credentials');
        });

        it('should fail login with non-existent email', async () => {
            const loginData: LoginRequest = {
                email: 'nonexistent@example.com',
                password: 'testpassword123'
            };

            await expect(AdminService.login(loginData, '127.0.0.1', 'test-agent'))
                .rejects.toThrow('Invalid credentials');
        });
    });

    describe('getAdminById', () => {
        it('should return admin user by ID', async () => {
            const admin = await AdminService.getAdminById(testAdminId);

            expect(admin).toBeDefined();
            expect(admin!.id).toBe(testAdminId);
            expect(admin!.email).toBe('test@example.com');
            expect(admin!.role).toBeDefined();
            expect(admin!.role!.name).toBe('test_role');
        });

        it('should return null for non-existent admin ID', async () => {
            const admin = await AdminService.getAdminById('non-existent-id');
            expect(admin).toBeNull();
        });
    });

    describe('updateAdminUser', () => {
        it('should update admin user successfully', async () => {
            const updateData = {
                firstName: 'Updated',
                lastName: 'Name',
                phone: '+9876543210'
            };

            const updatedAdmin = await AdminService.updateAdminUser(
                testAdminId,
                updateData,
                'system'
            );

            expect(updatedAdmin.firstName).toBe(updateData.firstName);
            expect(updatedAdmin.lastName).toBe(updateData.lastName);
            expect(updatedAdmin.phone).toBe(updateData.phone);
        });

        it('should throw error for non-existent admin ID', async () => {
            const updateData = {
                firstName: 'Updated'
            };

            await expect(AdminService.updateAdminUser(
                'non-existent-id',
                updateData,
                'system'
            )).rejects.toThrow('Admin user not found');
        });
    });

    describe('getAdminUsers', () => {
        it('should return paginated admin users', async () => {
            const result = await AdminService.getAdminUsers(1, 10);

            expect(result).toBeDefined();
            expect(result.users).toBeInstanceOf(Array);
            expect(result.total).toBeGreaterThan(0);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
            expect(result.users.length).toBeGreaterThan(0);
        });

        it('should filter admin users by search term', async () => {
            const result = await AdminService.getAdminUsers(1, 10, 'test@example.com');

            expect(result.users.length).toBeGreaterThan(0);
            expect(result.users[0].email).toContain('test@example.com');
        });
    });
});