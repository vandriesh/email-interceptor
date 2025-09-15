import { emailStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import { useState, useEffect } from 'react';
import type { EmailIssue } from '@extension/storage';

interface EmailModalProps {
    emails: string[];
    onClose: () => void;
    onProceed: () => void;
}

export default function EmailModal({ emails, onClose, onProceed }: EmailModalProps) {
    const [activeTab, setActiveTab] = useState<'issues' | 'history'>('issues');
    const [dismissedEmails, setDismissedEmails] = useState<EmailIssue[]>([]);
    const [remainingEmails, setRemainingEmails] = useState<string[]>(emails);

    useEffect(() => {
        console.log('EmailModal', emails);
        // Load dismissed emails
        const loadDismissedEmails = () => {
            const dismissed = emailStorage.getDismissedEmails();
            setDismissedEmails(dismissed);
        };

        loadDismissedEmails();

        // Subscribe to storage changes
        const unsubscribe = emailStorage.subscribe(loadDismissedEmails);

        return unsubscribe;
    }, []);

    const handleDismiss = async (email: string) => {
        await emailStorage.dismissEmail(email);
        setRemainingEmails(prev => prev.filter(e => e !== email));

        // If no emails left, close modal
        if (remainingEmails.length === 1) {
            onClose();
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const getTimeUntilExpiry = (dismissedUntil: number) => {
        const now = Date.now();
        const timeLeft = dismissedUntil - now;

        if (timeLeft <= 0) return 'Expired';

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        } else {
            return `${minutes}m remaining`;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">Email Monitor</h2>
                        <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="mt-4 flex space-x-1">
                        <button
                            onClick={() => setActiveTab('issues')}
                            className={cn(
                                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                                activeTab === 'issues'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-500 hover:text-gray-700',
                            )}>
                            Issues Found ({remainingEmails.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={cn(
                                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                                activeTab === 'history'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-500 hover:text-gray-700',
                            )}>
                            History ({dismissedEmails.length})
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="max-h-96 overflow-y-auto px-6 py-4">
                    {activeTab === 'issues' ? (
                        <div>
                            <p className="mb-4 text-gray-600">
                                Email addresses detected in your prompt. You can dismiss them for 24 hours or proceed
                                anyway.
                            </p>

                            {remainingEmails.length === 0 ? (
                                <div className="py-8 text-center">
                                    <div className="mb-2 text-green-600">
                                        <svg
                                            className="mx-auto h-12 w-12"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-gray-600">All email addresses have been dismissed!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {remainingEmails.map(email => (
                                        <div
                                            key={email}
                                            className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="text-red-500">
                                                    <svg
                                                        className="h-5 w-5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                                        />
                                                    </svg>
                                                </div>
                                                <span className="font-mono text-sm text-gray-800">{email}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDismiss(email)}
                                                className="rounded-md bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600">
                                                Dismiss
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p className="mb-4 text-gray-600">
                                Recently dismissed email addresses and their expiry times.
                            </p>

                            {dismissedEmails.length === 0 ? (
                                <div className="py-8 text-center">
                                    <div className="mb-2 text-gray-400">
                                        <svg
                                            className="mx-auto h-12 w-12"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-gray-600">No dismissed emails</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {dismissedEmails.map(email => (
                                        <div
                                            key={email.email}
                                            className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="text-orange-500">
                                                    <svg
                                                        className="h-5 w-5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                        />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="block font-mono text-sm text-gray-800">
                                                        {email.email}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        Dismissed: {formatTime(email.dismissedAt || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-medium text-orange-600">
                                                    {email.dismissedUntil
                                                        ? getTimeUntilExpiry(email.dismissedUntil)
                                                        : 'Unknown'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {activeTab === 'issues' && remainingEmails.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={onClose}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50">
                                Cancel
                            </button>
                            <button
                                onClick={onProceed}
                                className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700">
                                Proceed Anyway
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
