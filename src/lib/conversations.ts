'use client';

import { Message } from './api';

// Conversation interface
export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    estado?: string;
    createdAt: string;
    updatedAt: string;
}

// Storage key prefix
const STORAGE_KEY = 'Iurexia_conversations';
const ACTIVE_CONVERSATION_KEY = 'Iurexia_active_conversation';

// Generate unique ID
export function generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Generate title from first message
export function generateTitle(firstMessage: string): string {
    const maxLength = 40;
    const cleaned = firstMessage.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
}

// Get all conversations for current user
export function getConversations(): Conversation[] {
    if (typeof window === 'undefined') return [];

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const conversations: Conversation[] = JSON.parse(data);
        // Sort by updatedAt descending (most recent first)
        return conversations.sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    } catch {
        console.error('Error reading conversations from localStorage');
        return [];
    }
}

// Get a specific conversation by ID
export function getConversation(id: string): Conversation | null {
    const conversations = getConversations();
    return conversations.find(c => c.id === id) || null;
}

// Save a conversation
export function saveConversation(conversation: Conversation): void {
    if (typeof window === 'undefined') return;

    try {
        const conversations = getConversations();
        const existingIndex = conversations.findIndex(c => c.id === conversation.id);

        if (existingIndex >= 0) {
            conversations[existingIndex] = conversation;
        } else {
            conversations.unshift(conversation);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
        console.error('Error saving conversation to localStorage');
    }
}

// Delete a conversation
export function deleteConversation(id: string): void {
    if (typeof window === 'undefined') return;

    try {
        const conversations = getConversations();
        const filtered = conversations.filter(c => c.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

        // If deleting active conversation, clear it
        const activeId = getActiveConversationId();
        if (activeId === id) {
            setActiveConversationId(null);
        }
    } catch {
        console.error('Error deleting conversation from localStorage');
    }
}

// Create a new conversation
export function createConversation(estado?: string): Conversation {
    const now = new Date().toISOString();
    const conversation: Conversation = {
        id: generateId(),
        title: 'Nueva conversación',
        messages: [],
        estado,
        createdAt: now,
        updatedAt: now,
    };

    saveConversation(conversation);
    setActiveConversationId(conversation.id);

    return conversation;
}

// Update conversation with new message
export function addMessageToConversation(
    conversationId: string,
    message: Message
): Conversation | null {
    const conversation = getConversation(conversationId);
    if (!conversation) return null;

    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();

    // Update title if first user message
    if (conversation.messages.length === 1 && message.role === 'user') {
        conversation.title = generateTitle(message.content);
    }

    saveConversation(conversation);
    return conversation;
}

// Get/Set active conversation ID
export function getActiveConversationId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_CONVERSATION_KEY);
}

export function setActiveConversationId(id: string | null): void {
    if (typeof window === 'undefined') return;

    if (id) {
        localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    } else {
        localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    }
}

// Clear all conversations (for testing/debugging)
export function clearAllConversations(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
}
