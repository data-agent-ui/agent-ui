import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/apiService.js';
import { useAuth } from './AuthContext.js';

// Create context
const ConversationContext = createContext();

// Provider component
export function ConversationProvider({ children }) {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [pendingNewChat, setPendingNewChat] = useState(false);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [messages, setMessages] = useState([]);

    const { isAuthenticated, loading: authLoading } = useAuth();

    // Load conversations only when authenticated
    useEffect(() => {
        // Wait for auth to finish loading
        if (authLoading) return;

        // Only load if authenticated
        if (isAuthenticated) {
            loadConversations();
        } else {
            // Clear conversations if not authenticated
            setConversations([]);
            setActiveConversation(null);
            setMessages([]);
            setIsLoadingConversations(false);
        }
    }, [isAuthenticated, authLoading]);

    // Update messages when activeConversation changes
    useEffect(() => {
        const current = conversations.find(c => c.id === activeConversation);
        setMessages(current?.messages || []);
    }, [activeConversation, conversations]);

    // -------------------- Functions --------------------
    const loadConversations = async () => {
        try {
            setIsLoadingConversations(true);
            const response = await apiService.listConversations();
            if (!response.conversations) {
                setConversations([]);
                return;
            }

            const formattedConversations = await Promise.all(
                response.conversations.map(async (conv) => {
                    try {
                        const threadsResponse = await apiService.getConversationThreads(conv.conversation_id);

                        const messages = threadsResponse.success
                            ? threadsResponse.threads.map(thread => {
                                // Replace space with 'T' to parse as local time
                                const localDateString = thread.created_at.replace(' ', 'T');
                                const ts = new Date(localDateString).getTime();

                                return {
                                    id: thread.id,
                                    role: thread.role,
                                    content: thread.content,
                                    timestamp: ts,
                                    ...(thread.metadata || {}),
                                };
                            })
                            : [];

                        const lastMessageTimestamp = messages.length > 0
                            ? Math.max(...messages.map(m => m.timestamp))
                            : new Date(conv.created_at.replace(' ', 'T')).getTime();

                        return {
                            id: conv.conversation_id,
                            title: conv.title,
                            created: new Date(conv.created_at.replace(' ', 'T')).getTime(),
                            lastMessage: lastMessageTimestamp,
                            messages,
                        };
                    } catch (err) {
                        console.error('Failed to load threads for conversation:', conv.conversation_id, err);
                        const ts = new Date(conv.created_at.replace(' ', 'T')).getTime();
                        return {
                            id: conv.conversation_id,
                            title: conv.title,
                            created: ts,
                            lastMessage: ts,
                            messages: [],
                        };
                    }
                })
            );

            setConversations(formattedConversations);

            // Auto-select most recent conversation if we have any
            if (formattedConversations.length > 0 && !activeConversation) {
                const mostRecent = [...formattedConversations].sort((a, b) => b.lastMessage - a.lastMessage)[0];
                setActiveConversation(mostRecent.id);
            }
        } catch (err) {
            console.error('Failed to load conversations:', err);
            setConversations([]);
        } finally {
            setIsLoadingConversations(false);
        }
    };

    const createConversationFromFirstMessage = (firstMessage) => {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const title =
            firstMessage.role === 'user'
                ? firstMessage.content.length > 30
                    ? firstMessage.content.substring(0, 30) + '...'
                    : firstMessage.content
                : null;

        const newConv = {
            id,
            messages: [firstMessage],
            title,
            created: Date.now(),
            lastMessage: Date.now(),
        };

        setConversations(prev => [newConv, ...prev]);
        setActiveConversation(id);
        setPendingNewChat(false);
        setMessages([firstMessage]);

        return id;
    };

    const updateConversation = (conversationId, newMessage) => {
        setConversations(prev =>
            prev.map(conv => {
                if (conv.id !== conversationId) return conv;

                const updatedMessages = [...conv.messages, newMessage];
                const title =
                    conv.title ||
                    (newMessage.role === 'user' && updatedMessages.length === 1
                        ? newMessage.content.length > 30
                            ? newMessage.content.substring(0, 30) + '...'
                            : newMessage.content
                        : conv.title);

                if (activeConversation === conversationId) setMessages(updatedMessages);

                return { ...conv, messages: updatedMessages, lastMessage: Date.now(), title };
            })
        );
    };

    const getCurrentConversation = () => conversations.find(conv => conv.id === activeConversation);

    const ensureConversationOnFirstMessage = (firstMessage) => {
        if (!activeConversation && pendingNewChat) return createConversationFromFirstMessage(firstMessage);
        return activeConversation;
    };

    const handleDeleteConversation = async (conversationId) => {
        try {
            await apiService.deleteConversation(conversationId);
            setConversations(prev => prev.filter(conv => conv.id !== conversationId));

            // If deleting the active conversation, reset
            if (activeConversation === conversationId) {
                setActiveConversation(null);
                setPendingNewChat(true);
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to delete conversation:', err);
            throw err; // Re-throw so UI can handle the error
        }
    };

    const handleDeleteThread = async (conversationId, threadId) => {
        try {
            await apiService.deleteThread(threadId);
            setConversations(prev =>
                prev.map(conv => {
                    if (conv.id !== conversationId) return conv;
                    const updatedMessages = conv.messages.filter(msg => msg.id !== threadId);
                    if (activeConversation === conversationId) setMessages(updatedMessages);
                    return { ...conv, messages: updatedMessages };
                })
            );
        } catch (err) {
            console.error('Failed to delete thread:', err);
            throw err; // Re-throw so UI can handle the error
        }
    };

    return (
        <ConversationContext.Provider
            value={{
                conversations,
                activeConversation,
                pendingNewChat,
                isLoadingConversations,
                messages,
                setMessages,
                setActiveConversation,
                setPendingNewChat,
                loadConversations,
                createConversationFromFirstMessage,
                updateConversation,
                getCurrentConversation,
                ensureConversationOnFirstMessage,
                handleDeleteConversation,
                handleDeleteThread
            }}
        >
            {children}
        </ConversationContext.Provider>
    );
}

// Custom hook to use context
export const useConversationContext = () => {
    const context = useContext(ConversationContext);
    if (!context) throw new Error('useConversationContext must be used within ConversationProvider');
    return context;
};
