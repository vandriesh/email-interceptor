import { emailStorage } from '@extension/storage';
import { useState, useEffect } from 'react';
import type { EmailIssue } from '@extension/storage';

// Types for our email data
interface DismissedEmail {
    email: string;
    dismissedAt: number;
    expiresAt: number;
}

interface EmailModalProps {
    emails: string[];
    dismissedEmails: DismissedEmail[];
    onDismiss: (email: string) => void;
    // onProceed: () => void;
    onCancel: () => void;
    onClearHistory: () => void;
}

interface HistoryTabProps {
    dismissedEmails: DismissedEmail[];
    onClearHistory: () => void;
}

// Email Modal Component
const EmailModal: React.FC<EmailModalProps> = ({
    emails,
    dismissedEmails,
    onDismiss,
    // onProceed,
    onCancel,
    onClearHistory,
}) => {
    const [activeTab, setActiveTab] = useState<'issues' | 'history'>('issues');

    console.log('EmailModal', emails);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
                {/* Tab Headers */}
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('issues')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                            activeTab === 'issues'
                                ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}>
                        Issues Found
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                            activeTab === 'history'
                                ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}>
                        History
                    </button>
                </div>

                {/* Tab Content */}
                <div className="max-h-96 overflow-y-auto">
                    {activeTab === 'issues' ? (
                        <div className="p-6">
                            <div className="mb-4">
                                <h2 className="mb-2 text-xl font-semibold text-gray-900">Issues Found!</h2>
                                <p className="text-sm text-gray-600">
                                    The following email addresses were detected in your prompt:
                                </p>
                            </div>

                            <div className="mb-6 space-y-2">
                                {emails.map((email, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                                        <span className="font-mono text-sm text-gray-700">{email}</span>
                                        <button
                                            onClick={() => onDismiss(email)}
                                            className="rounded bg-red-500 px-3 py-1 text-xs text-white transition-colors hover:bg-red-600">
                                            Dismiss
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3">
                                {/* <button
                                    onClick={onCancel}
                                    className="rounded bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300">
                                    Cancel
                                </button> */}
                                <button
                                    onClick={onCancel}
                                    className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600">
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : (
                        <HistoryTab dismissedEmails={dismissedEmails} onClearHistory={onClearHistory} />
                    )}
                </div>
            </div>
        </div>
    );
};

// History Tab Component
const HistoryTab: React.FC<HistoryTabProps> = ({ dismissedEmails, onClearHistory }) => {
    const now = Date.now();

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Dismissed Emails</h3>
                <button
                    onClick={onClearHistory}
                    className="rounded bg-gray-500 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-600">
                    Clear History
                </button>
            </div>

            {dismissedEmails.length === 0 ? (
                <p className="py-8 text-center text-gray-500">No dismissed emails</p>
            ) : (
                <div className="space-y-2">
                    {dismissedEmails.map((item, index) => {
                        const isExpired = item.expiresAt < now;
                        const timeLeft = Math.max(0, item.expiresAt - now);
                        const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));

                        return (
                            <div
                                key={index}
                                className={`rounded-lg border p-3 ${
                                    isExpired ? 'border-gray-200 bg-gray-100' : 'border-yellow-200 bg-yellow-50'
                                }`}>
                                <div className="flex items-start justify-between">
                                    <span className="font-mono text-sm text-gray-700">{item.email}</span>
                                    <span
                                        className={`rounded px-2 py-1 text-xs ${
                                            isExpired ? 'bg-gray-200 text-gray-600' : 'bg-yellow-200 text-yellow-800'
                                        }`}>
                                        {isExpired ? 'Expired' : `${hoursLeft}h left`}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    Dismissed: {new Date(item.dismissedAt).toLocaleString()}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Main App Component
export default function App() {
    const [activeTab, setActiveTab] = useState<'issues' | 'history'>('issues');
    const [showModal, setShowModal] = useState(false);
    const [detectedEmails, setDetectedEmails] = useState<string[]>([]);
    const [dismissedEmails, setDismissedEmails] = useState<DismissedEmail[]>([]);

    useEffect(() => {
        console.log('[CEB] ChatGPT content UI loaded');

        // Load dismissed emails from storage
        const loadDismissedEmails = async () => {
            try {
                const dismissedEmails = emailStorage.getDismissedEmails();
                setDismissedEmails(
                    dismissedEmails.map((e: EmailIssue) => ({
                        email: e.email,
                        dismissedAt: e.dismissedAt || Date.now(),
                        expiresAt: e.dismissedUntil || Date.now(),
                    })),
                );
            } catch (error) {
                console.error('Error loading dismissed emails:', error);
            }
        };

        loadDismissedEmails();

        // If there are active detected emails in storage, open modal on load
        const checkAndOpenModalFromStorage = async () => {
            try {
                const activeEmails = emailStorage.getActiveEmails();
                console.log('[EmailMon][UI] checkAndOpenModalFromStorage', {
                    activeEmails: activeEmails.map((e: EmailIssue) => e.email),
                });

                if (activeEmails.length > 0) {
                    setDetectedEmails(activeEmails.map((e: EmailIssue) => e.email));
                    setShowModal(true);
                    setActiveTab('issues');
                }
            } catch (e) {
                console.error('[EmailMon][UI] error reading email storage', e);
            }
        };

        void checkAndOpenModalFromStorage();

        // Listen for storage changes using email storage service
        const unsubscribe = emailStorage.subscribe(() => {
            // Update dismissed emails when storage changes
            const dismissedEmails = emailStorage.getDismissedEmails();
            setDismissedEmails(
                dismissedEmails.map((e: EmailIssue) => ({
                    email: e.email,
                    dismissedAt: e.dismissedAt || Date.now(),
                    expiresAt: e.dismissedUntil || Date.now(),
                })),
            );

            // Check for active emails
            const activeEmails = emailStorage.getActiveEmails();
            console.log('[EmailMon][UI] storage change activeEmails', {
                activeEmails: activeEmails.map((e: EmailIssue) => e.email),
            });
            if (activeEmails.length > 0) {
                setDetectedEmails(activeEmails.map((e: EmailIssue) => e.email));
                setShowModal(true);
                setActiveTab('issues');
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    // Listen for messages from content script
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            console.log('[EmailMon] handleMessage', event.data);
            if (event.data.type === 'SHOW_EMAIL_MODAL') {
                setDetectedEmails(event.data.emails);
                setShowModal(true);
                setActiveTab('issues');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleDismissEmail = async (email: string) => {
        try {
            await emailStorage.dismissEmail(email);

            // Update local state
            const dismissedEmails = emailStorage.getDismissedEmails();
            setDismissedEmails(
                dismissedEmails.map((e: EmailIssue) => ({
                    email: e.email,
                    dismissedAt: e.dismissedAt || Date.now(),
                    expiresAt: e.dismissedUntil || Date.now(),
                })),
            );

            // Remove from detected emails
            setDetectedEmails(prev => prev.filter(e => e !== email));

            // If no more emails, close modal
            if (detectedEmails.length === 1) {
                setShowModal(false);
            }

            // Notify content script about the dismissal
            window.postMessage(
                {
                    type: 'EMAIL_DISMISSED',
                    email,
                },
                '*',
            );
        } catch (error) {
            console.error('Error dismissing email:', error);
        }
    };

    const handleCancel = () => {
        setShowModal(false);
    };

    const handleClearHistory = async () => {
        try {
            await emailStorage.clearAllDismissedEmails();
            setDismissedEmails([]);
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    };

    return (
        <div className="fixed bottom-24 right-4 z-40">
            {/* Main Extension Panel */}
            <div className="max-h-96 w-80 overflow-hidden rounded-lg border bg-white shadow-lg">
                {/* Tab Headers */}
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('issues')}
                        className={`flex-1 px-4 py-2 text-sm font-medium ${
                            activeTab === 'issues'
                                ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}>
                        Issue(s) Found
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 px-4 py-2 text-sm font-medium ${
                            activeTab === 'history'
                                ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}>
                        History
                    </button>
                </div>

                {/* Tab Content */}
                <div className="max-h-80 overflow-y-auto">
                    {activeTab === 'issues' ? (
                        <div className="p-4">
                            <p className="py-8 text-center text-gray-500">
                                Email interceptor is active. Try typing an email address in ChatGPT.
                            </p>
                        </div>
                    ) : (
                        <HistoryTab dismissedEmails={dismissedEmails} onClearHistory={handleClearHistory} />
                    )}
                </div>
            </div>
            {/* Email Modal */}
            {showModal && (
                <EmailModal
                    emails={detectedEmails}
                    dismissedEmails={dismissedEmails}
                    onDismiss={handleDismissEmail}
                    // onProceed={handleProceed}
                    onCancel={handleCancel}
                    onClearHistory={handleClearHistory}
                />
            )}
        </div>
    );
}
