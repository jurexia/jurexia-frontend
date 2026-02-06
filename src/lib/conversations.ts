'use client';

import { supabase } from './supabase';
import { Message } from './api';

// ============================================================================
// TYPES
// ============================================================================

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    estado?: string;
    createdAt: string;
    updatedAt: string;
}

interface DbConversation {
    id: string;
    user_id: string;
    title: string;
    estado: string | null;
    created_at: string;
    updated_at: string;
}

interface DbMessage {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generate title from first message
export function generateTitle(firstMessage: string): string {
    const maxLength = 40;
    const cleaned = firstMessage.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
}

// Convert DB format to frontend format
function dbToConversation(dbConv: DbConversation, messages: Message[] = []): Conversation {
    return {
        id: dbConv.id,
        title: dbConv.title,
        messages,
        estado: dbConv.estado || undefined,
        createdAt: dbConv.created_at,
        updatedAt: dbConv.updated_at,
    };
}

// Get current user ID
async function getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

// ============================================================================
// CONVERSATION CRUD OPERATIONS
// ============================================================================

// Get all conversations for current user
export async function getConversations(): Promise<Conversation[]> {
    const userId = await getCurrentUserId();
    if (!userId) {
        console.log('No user logged in, returning empty conversations');
        return [];
    }

    try {
        // Get all conversations for user, ordered by most recent first
        const { data: dbConversations, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error);
            return [];
        }

        if (!dbConversations || dbConversations.length === 0) {
            return [];
        }

        // Get message counts for each conversation (for display purposes)
        const conversations: Conversation[] = await Promise.all(
            dbConversations.map(async (dbConv: DbConversation) => {
                const { count } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('conversation_id', dbConv.id);

                return {
                    ...dbToConversation(dbConv),
                    messages: [], // Don't load all messages yet, just metadata
                };
            })
        );

        return conversations;
    } catch (error) {
        console.error('Error in getConversations:', error);
        return [];
    }
}

// Get a specific conversation by ID with all messages
export async function getConversation(id: string): Promise<Conversation | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    try {
        // Get conversation
        const { data: dbConv, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (convError || !dbConv) {
            console.error('Error fetching conversation:', convError);
            return null;
        }

        // Get all messages for this conversation
        const { data: dbMessages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });

        if (msgError) {
            console.error('Error fetching messages:', msgError);
            return dbToConversation(dbConv, []);
        }

        const messages: Message[] = (dbMessages || []).map((msg: DbMessage) => ({
            role: msg.role,
            content: msg.content,
        }));

        return dbToConversation(dbConv, messages);
    } catch (error) {
        console.error('Error in getConversation:', error);
        return null;
    }
}

// Create a new conversation
export async function createConversation(estado?: string): Promise<Conversation | null> {
    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('Cannot create conversation: no user logged in');
        return null;
    }

    try {
        const { data: dbConv, error } = await supabase
            .from('conversations')
            .insert({
                user_id: userId,
                title: 'Nueva conversación',
                estado: estado || null,
            })
            .select()
            .single();

        if (error || !dbConv) {
            console.error('Error creating conversation:', error);
            return null;
        }

        return dbToConversation(dbConv, []);
    } catch (error) {
        console.error('Error in createConversation:', error);
        return null;
    }
}

// Update conversation title
export async function updateConversationTitle(id: string, title: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('conversations')
            .update({ title })
            .eq('id', id);

        if (error) {
            console.error('Error updating conversation title:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error in updateConversationTitle:', error);
        return false;
    }
}

// Delete a conversation (messages cascade automatically)
export async function deleteConversation(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('conversations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting conversation:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error in deleteConversation:', error);
        return false;
    }
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

// Add a message to a conversation
export async function addMessageToConversation(
    conversationId: string,
    message: Message
): Promise<boolean> {
    try {
        // Insert the message
        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                role: message.role,
                content: message.content,
            });

        if (msgError) {
            console.error('Error adding message:', msgError);
            return false;
        }

        // Update conversation title if this is the first user message
        if (message.role === 'user') {
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conversationId);

            // If this is the first message (count would be 1 after insert)
            if (count === 1) {
                const title = generateTitle(message.content);
                await updateConversationTitle(conversationId, title);
            }
        }

        // Touch the conversation to update updated_at
        await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        return true;
    } catch (error) {
        console.error('Error in addMessageToConversation:', error);
        return false;
    }
}

// ============================================================================
// ACTIVE CONVERSATION (localStorage for UX, not persistence)
// ============================================================================

const ACTIVE_CONVERSATION_KEY = 'Iurexia_active_conversation';

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Clear all conversations for current user (admin/debug only)
export async function clearAllConversations(): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    try {
        const { error } = await supabase
            .from('conversations')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('Error clearing conversations:', error);
            return false;
        }

        localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
        return true;
    } catch (error) {
        console.error('Error in clearAllConversations:', error);
        return false;
    }
}

// Legacy function for backwards compatibility (deprecated)
export function generateId(): string {
    return crypto.randomUUID();
}

// Legacy function - now a no-op since we save to DB directly
export function saveConversation(_conversation: Conversation): void {
    console.warn('saveConversation is deprecated. Messages are saved directly to database.');
}
