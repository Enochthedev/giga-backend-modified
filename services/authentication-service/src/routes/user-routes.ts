import { Router, Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user-model';
import { ApiResponseUtil, ValidationMiddleware } from '@giga/common';
import { userValidationSchemas } from '../validation/user-validation';

const router = Router();

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id',
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const user = await UserModel.findById(id!);

            if (!user) {
                return res.status(404).json(
                    ApiResponseUtil.error(
                        'User not found',
                        'USER_NOT_FOUND',
                        req.headers['x-request-id'] as string
                    )
                );
            }

            res.json(
                ApiResponseUtil.success({
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    dateOfBirth: user.dateOfBirth,
                    isVerified: user.isVerified,
                    lastLoginAt: user.lastLoginAt,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }, 'User retrieved successfully', req.headers['x-request-id'] as string)
            );
            return;
        } catch (error) {
            next(error);
            return;
        }
    }
);

/**
 * GET /api/users/:id/profile
 * Get user profile with roles and permissions
 */
router.get('/:id/profile',
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userWithRoles = await UserModel.findByIdWithRoles(id!);

            if (!userWithRoles) {
                return res.status(404).json(
                    ApiResponseUtil.error(
                        'User not found',
                        'USER_NOT_FOUND',
                        req.headers['x-request-id'] as string
                    )
                );
            }

            res.json(
                ApiResponseUtil.success({
                    id: userWithRoles.id,
                    email: userWithRoles.email,
                    firstName: userWithRoles.firstName,
                    lastName: userWithRoles.lastName,
                    phone: userWithRoles.phone,
                    dateOfBirth: userWithRoles.dateOfBirth,
                    isVerified: userWithRoles.isVerified,
                    lastLoginAt: userWithRoles.lastLoginAt,
                    createdAt: userWithRoles.createdAt,
                    updatedAt: userWithRoles.updatedAt,
                    roles: userWithRoles.roles.map(role => ({
                        id: role.id,
                        name: role.name,
                        permissions: role.permissions
                    }))
                }, 'User profile retrieved successfully', req.headers['x-request-id'] as string)
            );
            return;
        } catch (error) {
            next(error);
            return;
        }
    }
);

/**
 * PUT /api/users/:id
 * Update user information
 */
router.put('/:id',
    ValidationMiddleware.validateUuidParams('id'),
    ValidationMiddleware.validateZod(userValidationSchemas.updateUser),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const updatedUser = await UserModel.update(id!, req.body);

            res.json(
                ApiResponseUtil.success({
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    phone: updatedUser.phone,
                    dateOfBirth: updatedUser.dateOfBirth,
                    isVerified: updatedUser.isVerified,
                    lastLoginAt: updatedUser.lastLoginAt,
                    createdAt: updatedUser.createdAt,
                    updatedAt: updatedUser.updatedAt
                }, 'User updated successfully', req.headers['x-request-id'] as string)
            );
            return;
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /api/users/:id
 * Deactivate user (soft delete)
 */
router.delete('/:id',
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            await UserModel.deactivate(id!);

            res.json(
                ApiResponseUtil.success(
                    null,
                    'User deactivated successfully',
                    req.headers['x-request-id'] as string
                )
            );
            return;
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/users/:id/verify-email
 * Verify user email
 */
router.post('/:id/verify-email',
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            await UserModel.verifyEmail(id!);

            res.json(
                ApiResponseUtil.success(
                    null,
                    'Email verified successfully',
                    req.headers['x-request-id'] as string
                )
            );
            return;
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/users/:id/roles/:roleName
 * Assign role to user
 */
router.post('/:id/roles/:roleName',
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, roleName } = req.params;

            // Validate role name
            const validRoles = ['super_admin', 'admin', 'user', 'vendor', 'driver', 'property_owner'];
            if (!roleName || !validRoles.includes(roleName)) {
                return res.status(400).json(
                    ApiResponseUtil.error(
                        `Invalid role. Valid roles are: ${validRoles.join(', ')}`,
                        'INVALID_ROLE',
                        req.headers['x-request-id'] as string
                    )
                );
            }

            await UserModel.assignRole(id!, roleName!);

            res.json(
                ApiResponseUtil.success(
                    null,
                    `Role '${roleName}' assigned successfully`,
                    req.headers['x-request-id'] as string
                )
            );
            return;
        } catch (error) {
            next(error);
            return;
        }
    }
);

/**
 * DELETE /api/users/:id/roles/:roleName
 * Remove role from user
 */
router.delete('/:id/roles/:roleName',
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, roleName } = req.params;
            await UserModel.removeRole(id!, roleName!);

            res.json(
                ApiResponseUtil.success(
                    null,
                    `Role '${roleName}' removed successfully`,
                    req.headers['x-request-id'] as string
                )
            );
            return;
        } catch (error) {
            next(error);
        }
    }
);

export default router;