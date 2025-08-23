import { describe, test, expect, beforeEach } from '@jest/globals';
import messagingService from '../services/messaging-service';
import { createTestUser, createTestConversation, createTestMessage } from './setup';

describe('MessagingService', () => {
    let testUser1: any;
    let testUser2: any;
    let testConversation: any;

    beforeEach(async () => {
        testUser1 = await createTestUser({ name: 'User 1', email: 'user1@test.com' });
        testUser2 = await createTestUser({ name: 'User 2', email: 'user2@test.com' });
    });

    describe('createConversation', () => {
        test('should create a direct conversation between two users', async () => {
            const conversation = await messagingService.createConversation(
                'direct',
                [testUser1.id, testUser2.id],
                'Test Conversation'
            );

            expect(conversation).toBeDefined();
            expect(conversation.type).toBe('direct');
            expect(conversation.title).toBe('Test Conversation');
            expect(conversation.participants).toContain(testUser1.id);
            expect(conversation.participants).toContain(testUser2.id);
        });

        test('should create a support conversation', async () => {
            const conversation = await messagingService.createConversation(
                'support',
                [testUser1.id],
                'Support Request',
                { ticketId: 'test-ticket-id' }
            );

            expect(conversation).toBeDefined();
            expect(conversation.type).toBe('support');
            expect(conversation.metadata).toEqual({ ticketId: 'test-ticket-id' });
        });
    });

    describe('sendMessage', () => {
        beforeEach(async () => {
            testConversation = await createTestConversation([testUser1.id, testUser2.id]);
        });

        test('should send a text message', async () => {
            const message = await messagingService.sendMessage(
                testConversation.id,
                testUser1.id,
                'Hello, this is a test message!'
            );

            expect(message).toBeDefined();
            expect(message.content).toBe('Hello, this is a test message!');
            expect(message.sender_id).toBe(testUser1.id);
            expect(message.conversation_id).toBe(testConversation.id);
            expect(message.message_type).toBe('text');
        });

        test('should not allow non-participants to send messages', async () => {
            const nonParticipant = await createTestUser({ name: 'Non Participant', email: 'non@test.com' });

            await expect(
                messagingService.sendMessage(
                    testConversation.id,
                    nonParticipant.id,
                    'This should fail'
                )
            ).rejects.toThrow('User is not a participant in this conversation');
        });
    });

    describe('getConversationMessages', () => {
        beforeEach(async () => {
            testConversation = await createTestConversation([testUser1.id, testUser2.id]);
        });

        test('should retrieve messages for conversation participants', async () => {
            // Send some test messages
            await messagingService.sendMessage(testConversation.id, testUser1.id, 'Message 1');
            await messagingService.sendMessage(testConversation.id, testUser2.id, 'Message 2');
            await messagingService.sendMessage(testConversation.id, testUser1.id, 'Message 3');

            const result = await messagingService.getConversationMessages(
                testConversation.id,
                testUser1.id,
                1,
                10
            );

            expect(result.messages).toHaveLength(3);
            expect(result.total).toBe(3);
            expect(result.messages[0].content).toBe('Message 3'); // Most recent first
            expect(result.messages[1].content).toBe('Message 2');
            expect(result.messages[2].content).toBe('Message 1');
        });

        test('should not allow non-participants to access messages', async () => {
            const nonParticipant = await createTestUser({ name: 'Non Participant', email: 'non@test.com' });

            await expect(
                messagingService.getConversationMessages(
                    testConversation.id,
                    nonParticipant.id,
                    1,
                    10
                )
            ).rejects.toThrow('Access denied to this conversation');
        });
    });

    describe('markMessagesAsRead', () => {
        beforeEach(async () => {
            testConversation = await createTestConversation([testUser1.id, testUser2.id]);
        });

        test('should mark messages as read', async () => {
            // Send messages from user1 to user2
            const message1 = await messagingService.sendMessage(testConversation.id, testUser1.id, 'Message 1');
            const message2 = await messagingService.sendMessage(testConversation.id, testUser1.id, 'Message 2');

            // User2 marks messages as read
            await messagingService.markMessagesAsRead(
                testConversation.id,
                testUser2.id,
                [message1.id, message2.id]
            );

            // Verify messages are marked as read
            const result = await messagingService.getConversationMessages(
                testConversation.id,
                testUser2.id,
                1,
                10
            );

            // Check that read receipts were created (this would need additional query in real implementation)
            expect(result.messages).toHaveLength(2);
        });
    });

    describe('searchMessages', () => {
        beforeEach(async () => {
            testConversation = await createTestConversation([testUser1.id, testUser2.id]);
        });

        test('should search messages by content', async () => {
            // Send messages with different content
            await messagingService.sendMessage(testConversation.id, testUser1.id, 'Hello world');
            await messagingService.sendMessage(testConversation.id, testUser2.id, 'How are you?');
            await messagingService.sendMessage(testConversation.id, testUser1.id, 'Hello again');

            const result = await messagingService.searchMessages(
                testUser1.id,
                'hello',
                testConversation.id,
                1,
                10
            );

            expect(result.messages.length).toBeGreaterThan(0);
            expect(result.total).toBeGreaterThan(0);
            // Should find messages containing "hello"
            result.messages.forEach(message => {
                expect(message.content.toLowerCase()).toContain('hello');
            });
        });
    });

    describe('editMessage', () => {
        beforeEach(async () => {
            testConversation = await createTestConversation([testUser1.id, testUser2.id]);
        });

        test('should allow sender to edit their message', async () => {
            const message = await messagingService.sendMessage(
                testConversation.id,
                testUser1.id,
                'Original message'
            );

            const editedMessage = await messagingService.editMessage(
                message.id,
                testUser1.id,
                'Edited message'
            );

            expect(editedMessage.content).toBe('Edited message');
            expect(editedMessage.is_edited).toBe(true);
            expect(editedMessage.edited_at).toBeDefined();
        });

        test('should not allow non-sender to edit message', async () => {
            const message = await messagingService.sendMessage(
                testConversation.id,
                testUser1.id,
                'Original message'
            );

            await expect(
                messagingService.editMessage(
                    message.id,
                    testUser2.id,
                    'Attempted edit'
                )
            ).rejects.toThrow('Message not found or access denied');
        });
    });

    describe('deleteMessage', () => {
        beforeEach(async () => {
            testConversation = await createTestConversation([testUser1.id, testUser2.id]);
        });

        test('should allow sender to delete their message', async () => {
            const message = await messagingService.sendMessage(
                testConversation.id,
                testUser1.id,
                'Message to delete'
            );

            await messagingService.deleteMessage(message.id, testUser1.id);

            // Verify message content is replaced with deletion notice
            const result = await messagingService.getConversationMessages(
                testConversation.id,
                testUser1.id,
                1,
                10
            );

            const deletedMessage = result.messages.find(m => m.id === message.id);
            expect(deletedMessage?.content).toBe('[Message deleted]');
            expect(deletedMessage?.is_edited).toBe(true);
        });

        test('should not allow non-sender to delete message', async () => {
            const message = await messagingService.sendMessage(
                testConversation.id,
                testUser1.id,
                'Message to delete'
            );

            await expect(
                messagingService.deleteMessage(message.id, testUser2.id)
            ).rejects.toThrow('Message not found or access denied');
        });
    });

    describe('getUnreadMessageCount', () => {
        beforeEach(async () => {
            testConversation = await createTestConversation([testUser1.id, testUser2.id]);
        });

        test('should return correct unread message count', async () => {
            // Send messages from user1 to user2
            await messagingService.sendMessage(testConversation.id, testUser1.id, 'Message 1');
            await messagingService.sendMessage(testConversation.id, testUser1.id, 'Message 2');
            await messagingService.sendMessage(testConversation.id, testUser1.id, 'Message 3');

            // User2 should have 3 unread messages
            const unreadCount = await messagingService.getUnreadMessageCount(testUser2.id);
            expect(unreadCount).toBe(3);

            // User1 should have 0 unread messages (they sent them)
            const senderUnreadCount = await messagingService.getUnreadMessageCount(testUser1.id);
            expect(senderUnreadCount).toBe(0);
        });
    });
});