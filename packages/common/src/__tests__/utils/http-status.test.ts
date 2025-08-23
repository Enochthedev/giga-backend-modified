import { HTTP_STATUS, HttpStatusUtil } from '../../utils/http-status';

describe('HttpStatusUtil', () => {
    describe('status code checks', () => {
        it('should identify informational status codes', () => {
            expect(HttpStatusUtil.isInformational(100)).toBe(true);
            expect(HttpStatusUtil.isInformational(199)).toBe(true);
            expect(HttpStatusUtil.isInformational(200)).toBe(false);
        });

        it('should identify success status codes', () => {
            expect(HttpStatusUtil.isSuccess(200)).toBe(true);
            expect(HttpStatusUtil.isSuccess(299)).toBe(true);
            expect(HttpStatusUtil.isSuccess(300)).toBe(false);
        });

        it('should identify redirection status codes', () => {
            expect(HttpStatusUtil.isRedirection(300)).toBe(true);
            expect(HttpStatusUtil.isRedirection(399)).toBe(true);
            expect(HttpStatusUtil.isRedirection(400)).toBe(false);
        });

        it('should identify client error status codes', () => {
            expect(HttpStatusUtil.isClientError(400)).toBe(true);
            expect(HttpStatusUtil.isClientError(499)).toBe(true);
            expect(HttpStatusUtil.isClientError(500)).toBe(false);
        });

        it('should identify server error status codes', () => {
            expect(HttpStatusUtil.isServerError(500)).toBe(true);
            expect(HttpStatusUtil.isServerError(599)).toBe(true);
            expect(HttpStatusUtil.isServerError(600)).toBe(false);
        });

        it('should identify error status codes', () => {
            expect(HttpStatusUtil.isError(400)).toBe(true);
            expect(HttpStatusUtil.isError(500)).toBe(true);
            expect(HttpStatusUtil.isError(200)).toBe(false);
        });
    });

    describe('getStatusMessage', () => {
        it('should return correct message for known status codes', () => {
            expect(HttpStatusUtil.getStatusMessage(200)).toBe('OK');
            expect(HttpStatusUtil.getStatusMessage(404)).toBe('Not Found');
            expect(HttpStatusUtil.getStatusMessage(500)).toBe('Internal Server Error');
        });

        it('should return "Unknown Status" for unknown status codes', () => {
            expect(HttpStatusUtil.getStatusMessage(999)).toBe('Unknown Status');
        });
    });

    describe('getStatusCategory', () => {
        it('should return correct category for status codes', () => {
            expect(HttpStatusUtil.getStatusCategory(100)).toBe('Informational');
            expect(HttpStatusUtil.getStatusCategory(200)).toBe('Success');
            expect(HttpStatusUtil.getStatusCategory(300)).toBe('Redirection');
            expect(HttpStatusUtil.getStatusCategory(400)).toBe('Client Error');
            expect(HttpStatusUtil.getStatusCategory(500)).toBe('Server Error');
            expect(HttpStatusUtil.getStatusCategory(999)).toBe('Unknown');
        });
    });

    describe('createStatusResponse', () => {
        it('should create proper status response object', () => {
            const response = HttpStatusUtil.createStatusResponse(200, { id: 1 });

            expect(response).toMatchObject({
                statusCode: 200,
                message: 'OK',
                category: 'Success',
                success: true,
                data: { id: 1 }
            });
            expect(response.timestamp).toBeDefined();
        });
    });

    describe('common responses', () => {
        it('should create OK response', () => {
            const response = HttpStatusUtil.responses.ok({ id: 1 });
            expect(response.statusCode).toBe(200);
            expect(response.success).toBe(true);
            expect(response.data).toEqual({ id: 1 });
        });

        it('should create error responses', () => {
            const badRequest = HttpStatusUtil.responses.badRequest('Invalid input');
            expect(badRequest.statusCode).toBe(400);
            expect(badRequest.success).toBe(false);
            expect(badRequest.data.error).toBe('Invalid input');

            const notFound = HttpStatusUtil.responses.notFound('Resource not found');
            expect(notFound.statusCode).toBe(404);
            expect(notFound.success).toBe(false);
            expect(notFound.data.error).toBe('Resource not found');
        });
    });

    describe('HTTP_STATUS constants', () => {
        it('should have correct status code values', () => {
            expect(HTTP_STATUS.OK).toBe(200);
            expect(HTTP_STATUS.CREATED).toBe(201);
            expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
            expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
            expect(HTTP_STATUS.NOT_FOUND).toBe(404);
            expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
        });
    });
});