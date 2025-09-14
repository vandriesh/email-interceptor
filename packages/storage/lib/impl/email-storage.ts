import { createStorage, StorageEnum } from '../base/index.js';
import type { BaseStorageType } from '../base/types.js';

export interface EmailIssue {
    email: string;
    detectedAt: number;
    dismissedAt?: number;
    dismissedUntil?: number;
}

export interface EmailStateType {
    detectedEmails: EmailIssue[];
    dismissedEmails: EmailIssue[];
}

export type EmailStorageType = BaseStorageType<EmailStateType> & {
    addDetectedEmail: (email: string) => Promise<void>;
    dismissEmail: (email: string) => Promise<void>;
    isEmailDismissed: (email: string) => boolean;
    getActiveEmails: () => EmailIssue[];
    getDismissedEmails: () => EmailIssue[];
    clearExpiredDismissals: () => Promise<void>;
    clearAllDismissedEmails: () => Promise<void>;
};

const storage = createStorage<EmailStateType>(
    'email-storage-key',
    {
        detectedEmails: [],
        dismissedEmails: [],
    },
    {
        storageEnum: StorageEnum.Local,
        liveUpdate: true,
    },
);

export const emailStorage: EmailStorageType = {
    ...storage,

    addDetectedEmail: async (email: string) => {
        await storage.set(currentState => {
            const now = Date.now();
            const existingEmail = currentState.detectedEmails.find(e => e.email === email);

            if (existingEmail) {
                // Update existing email detection time
                return {
                    ...currentState,
                    detectedEmails: currentState.detectedEmails.map(e =>
                        e.email === email ? { ...e, detectedAt: now } : e,
                    ),
                };
            } else {
                // Add new email
                return {
                    ...currentState,
                    detectedEmails: [...currentState.detectedEmails, { email, detectedAt: now }],
                };
            }
        });
    },

    dismissEmail: async (email: string) => {
        await storage.set(currentState => {
            const now = Date.now();
            const dismissUntil = now + 5 * 60 * 1000; // 5 minutes from now (for testing)

            // Remove from detected emails
            const updatedDetectedEmails = currentState.detectedEmails.filter(e => e.email !== email);

            // Add to dismissed emails
            const dismissedEmail: EmailIssue = {
                email,
                detectedAt: currentState.detectedEmails.find(e => e.email === email)?.detectedAt || now,
                dismissedAt: now,
                dismissedUntil: dismissUntil,
            };

            return {
                detectedEmails: updatedDetectedEmails,
                dismissedEmails: [...currentState.dismissedEmails, dismissedEmail],
            };
        });
    },

    isEmailDismissed: (email: string) => {
        const currentState = storage.getSnapshot();
        if (!currentState) return false;

        const dismissedEmail = currentState.dismissedEmails.find(e => e.email === email);
        if (!dismissedEmail || !dismissedEmail.dismissedUntil) return false;

        return Date.now() < dismissedEmail.dismissedUntil;
    },

    getActiveEmails: () => {
        const currentState = storage.getSnapshot();
        if (!currentState) return [];

        return currentState.detectedEmails.filter(email => !emailStorage.isEmailDismissed(email.email));
    },

    getDismissedEmails: () => {
        const currentState = storage.getSnapshot();
        if (!currentState) return [];

        return currentState.dismissedEmails.filter(email => email.dismissedUntil && Date.now() < email.dismissedUntil);
    },

    clearExpiredDismissals: async () => {
        await storage.set(currentState => {
            const now = Date.now();
            return {
                ...currentState,
                dismissedEmails: currentState.dismissedEmails.filter(
                    email => email.dismissedUntil && email.dismissedUntil > now,
                ),
            };
        });
    },

    clearAllDismissedEmails: async () => {
        await storage.set(currentState => ({
            ...currentState,
            dismissedEmails: [],
        }));
    },
};
