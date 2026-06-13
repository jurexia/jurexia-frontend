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
    messageCount?: number;  // For sidebar display without loading all messages
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

// Pending messages stored in localStorage for crash recovery
interface PendingMessage {
    conversationId: string;
    message: Message;
    timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_CONVERSATIONS = 200; // Ampliado: mantener 200 conversaciones por usuario
const CONVERSATION_WARNING_THRESHOLD = 0.9; // Advertir al usuario al 90% (180 convs)
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000; // 1s, 2s, 4s exponential backoff
const PENDING_MESSAGES_KEY = 'Iurexia_pending_messages';
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours — discard stale pending messages

// ============================================================================
// RETRY HELPER
// ============================================================================

/**
 * Retry an async operation with exponential backoff.
 * Returns the result on success, throws on final failure.
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    label: string,
    maxAttempts = MAX_RETRY_ATTEMPTS
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (err) {
            lastError = err;
            if (attempt < maxAttempts - 1) {
                const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
                console.warn(`⚠️ ${label} failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms...`, err);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    console.error(`❌ ${label} failed after ${maxAttempts} attempts`, lastError);
    throw lastError;
}

// ============================================================================
// LOCALSTORAGE FALLBACK (for crash recovery)
// ============================================================================

function getPendingMessages(): PendingMessage[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(PENDING_MESSAGES_KEY);
        if (!raw) return [];
        const pending: PendingMessage[] = JSON.parse(raw);
        // Filter out stale messages (older than 24h)
        const now = Date.now();
        return pending.filter(p => now - p.timestamp < PENDING_MAX_AGE_MS);
    } catch {
        return [];
    }
}

function savePendingMessage(conversationId: string, message: Message): void {
    if (typeof window === 'undefined') return;
    try {
        const pending = getPendingMessages();
        pending.push({ conversationId, message, timestamp: Date.now() });
        localStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(pending));
        console.log(`💾 Message saved to localStorage fallback (conv: ${conversationId.slice(0, 8)}...)`);
    } catch {
        // localStorage full or unavailable — nothing we can do
    }
}

function clearPendingMessages(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(PENDING_MESSAGES_KEY);
    } catch {}
}

function removePendingMessage(conversationId: string, role: string): void {
    if (typeof window === 'undefined') return;
    try {
        const pending = getPendingMessages();
        // Remove the first matching message (FIFO)
        const idx = pending.findIndex(
            p => p.conversationId === conversationId && p.message.role === role
        );
        if (idx !== -1) {
            pending.splice(idx, 1);
            if (pending.length === 0) {
                localStorage.removeItem(PENDING_MESSAGES_KEY);
            } else {
                localStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(pending));
            }
        }
    } catch {}
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
        // Get conversations with message counts in a single query (avoids N+1)
        const { data: dbConversations, error } = await supabase
            .from('conversations')
            .select('*, messages(count)')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(MAX_CONVERSATIONS);

        if (error) {
            console.error('Error fetching conversations:', error);
            return [];
        }

        if (!dbConversations || dbConversations.length === 0) {
            return [];
        }

        // Map to frontend format with message count from the joined query
        const conversations: Conversation[] = dbConversations.map((dbConv: any) => {
            // Supabase returns count as [{count: N}] when using select('*, relation(count)')
            const msgCount = dbConv.messages?.[0]?.count ?? 0;
            return {
                ...dbToConversation(dbConv),
                messages: [], // Don't load all messages yet, just metadata
                messageCount: msgCount,
            };
        });

        // Filter out empty conversations (0 messages) to keep sidebar clean
        return conversations.filter(c => (c.messageCount ?? 0) > 0);
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

// Create a new conversation (with soft enforcement: max 200)
export async function createConversation(estado?: string): Promise<Conversation | null> {
    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('Cannot create conversation: no user logged in');
        return null;
    }

    try {
        // ── Count existing conversations ──────────────────────────────
        const { count: existingCount, error: countError } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        const currentCount = existingCount ?? 0;

        // ── Clean up empty conversations first (no messages = wasted slots) ──
        if (!countError && currentCount > 0) {
            const { data: allConvs } = await supabase
                .from('conversations')
                .select('id, messages(count)')
                .eq('user_id', userId);

            if (allConvs) {
                const emptyConvIds = allConvs
                    .filter((c: any) => (c.messages?.[0]?.count ?? 0) === 0)
                    .map((c: any) => c.id);

                if (emptyConvIds.length > 0) {
                    console.log(`🧹 Cleaning ${emptyConvIds.length} empty conversation(s)`);
                    await supabase
                        .from('conversations')
                        .delete()
                        .in('id', emptyConvIds);
                }
            }
        }

        // ── Warn if approaching limit (90%) but DON'T delete ──────────
        const warningThreshold = Math.floor(MAX_CONVERSATIONS * CONVERSATION_WARNING_THRESHOLD);
        if (currentCount >= warningThreshold) {
            console.warn(
                `⚠️ User ${userId} has ${currentCount}/${MAX_CONVERSATIONS} conversations ` +
                `(${Math.round((currentCount / MAX_CONVERSATIONS) * 100)}% of limit)`
            );
        }

        // ── Only delete oldest if HARD limit is exceeded ───────────────
        // Unlike before, we only trim 1 conversation (the oldest) to make room,
        // instead of bulk-deleting everything beyond the limit
        if (currentCount >= MAX_CONVERSATIONS) {
            const { data: oldest } = await supabase
                .from('conversations')
                .select('id')
                .eq('user_id', userId)
                .order('updated_at', { ascending: true })
                .limit(1);

            if (oldest && oldest.length > 0) {
                console.warn(`🗑️ Limit reached (${MAX_CONVERSATIONS}): removing 1 oldest conversation for user ${userId}`);
                await supabase
                    .from('conversations')
                    .delete()
                    .eq('id', oldest[0].id);
            }
        }

        // ── Create the new conversation ────────────────────────────────
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
// MESSAGE OPERATIONS (with retry + fallback)
// ============================================================================

// Add a single message to a conversation — with retry and localStorage fallback
export async function addMessageToConversation(
    conversationId: string,
    message: Message
): Promise<boolean> {
    try {
        await withRetry(async () => {
            // Insert the message
            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    role: message.role,
                    content: message.content,
                });

            if (msgError) throw msgError;
        }, `addMessage(${message.role})`);

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

        // Clear this message from pending fallback if it was there
        removePendingMessage(conversationId, message.role);

        return true;
    } catch (error) {
        console.error('Error in addMessageToConversation (all retries exhausted):', error);
        // ── FALLBACK: Save to localStorage for recovery ──
        savePendingMessage(conversationId, message);
        return false;
    }
}

/**
 * Save a user+assistant message pair atomically.
 * This is the preferred method — called after the assistant finishes streaming.
 * If the DB save fails after retries, messages are saved to localStorage for recovery.
 */
export async function addMessageBatch(
    conversationId: string,
    userMessage: Message,
    assistantMessage: Message
): Promise<boolean> {
    try {
        await withRetry(async () => {
            const { error } = await supabase
                .from('messages')
                .insert([
                    {
                        conversation_id: conversationId,
                        role: userMessage.role,
                        content: userMessage.content,
                    },
                    {
                        conversation_id: conversationId,
                        role: assistantMessage.role,
                        content: assistantMessage.content,
                    },
                ]);

            if (error) throw error;
        }, 'addMessageBatch');

        // Auto-generate title from first user message
        const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId);

        if (count && count <= 2) {
            // This is the first pair — set title
            const title = generateTitle(userMessage.content);
            await updateConversationTitle(conversationId, title);
        }

        // Touch updated_at
        await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        // Clear from pending
        removePendingMessage(conversationId, 'user');
        removePendingMessage(conversationId, 'assistant');

        console.log(`✅ Message pair saved to conversation ${conversationId.slice(0, 8)}...`);
        return true;
    } catch (error) {
        console.error('Error in addMessageBatch (all retries exhausted):', error);
        // ── FALLBACK: Save both to localStorage ──
        savePendingMessage(conversationId, userMessage);
        savePendingMessage(conversationId, assistantMessage);
        return false;
    }
}

// ============================================================================
// CRASH RECOVERY
// ============================================================================

/**
 * Recover messages that were saved to localStorage because Supabase was down.
 * Call this on app initialization (after auth is confirmed).
 * Returns the number of messages successfully recovered.
 */
export async function recoverPendingMessages(): Promise<number> {
    const pending = getPendingMessages();
    if (pending.length === 0) return 0;

    console.log(`🔄 Recovering ${pending.length} pending message(s) from localStorage...`);
    let recovered = 0;

    for (const item of pending) {
        try {
            // Verify the conversation still exists
            const { data: conv } = await supabase
                .from('conversations')
                .select('id')
                .eq('id', item.conversationId)
                .single();

            if (!conv) {
                // Conversation was deleted — discard the pending message
                removePendingMessage(item.conversationId, item.message.role);
                continue;
            }

            // Check if this message is already in the DB (avoid duplicates)
            const { data: existing } = await supabase
                .from('messages')
                .select('id')
                .eq('conversation_id', item.conversationId)
                .eq('role', item.message.role)
                .eq('content', item.message.content)
                .limit(1);

            if (existing && existing.length > 0) {
                // Already saved — remove from pending
                removePendingMessage(item.conversationId, item.message.role);
                recovered++;
                continue;
            }

            // Try to save
            const { error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: item.conversationId,
                    role: item.message.role,
                    content: item.message.content,
                });

            if (!error) {
                removePendingMessage(item.conversationId, item.message.role);
                recovered++;
            }
        } catch (err) {
            console.warn('Failed to recover message:', err);
            // Leave in localStorage for next attempt
        }
    }

    if (recovered > 0) {
        console.log(`✅ Recovered ${recovered} message(s) from localStorage`);
    }

    // Clean up any remaining stale entries
    const remaining = getPendingMessages();
    if (remaining.length === 0) {
        clearPendingMessages();
    }

    return recovered;
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
        clearPendingMessages();
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
