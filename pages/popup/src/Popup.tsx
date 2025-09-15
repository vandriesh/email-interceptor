import '@src/Popup.css';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, emailStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';
import { useEffect, useState } from 'react';
import type { EmailIssue } from '@extension/storage';

const notificationOptions = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon-34.png'),
    title: 'Injecting content script error',
    message: 'You cannot inject script here!',
} as const;

const Popup = () => {
    const { isLight } = useStorage(exampleThemeStorage);
    const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';
    const [activeTab, setActiveTab] = useState<'issues' | 'dismissed'>('issues');
    const [activeEmails, setActiveEmails] = useState<EmailIssue[]>([]);
    const [dismissedEmails, setDismissedEmails] = useState<EmailIssue[]>([]);

    const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

    useEffect(() => {
        const update = () => {
            const act = emailStorage.getActiveEmails();
            const dis = emailStorage.getDismissedEmails();
            setActiveEmails(act);
            setDismissedEmails(dis);
        };

        update();
        const unsubscribe = emailStorage.subscribe(update);
        return unsubscribe;
    }, []);

    const injectContentScript = async () => {
        const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

        if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
            chrome.notifications.create('inject-error', notificationOptions);
        }

        await chrome.scripting
            .executeScript({
                target: { tabId: tab.id! },
                files: ['/content-runtime/example.iife.js', '/content-runtime/all.iife.js'],
            })
            .catch(err => {
                // Handling errors related to other paths
                if (err.message.includes('Cannot access a chrome:// URL')) {
                    chrome.notifications.create('inject-error', notificationOptions);
                }
            });
    };

    return (
        <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
            <header className={cn('App-header', isLight ? 'text-gray-900' : 'text-gray-100')}>
                <button onClick={goGithubSite}>
                    <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
                </button>
                <p>Email Monitor</p>

                {/* Tabs */}
                <div className="mt-3 flex rounded-lg border">
                    <button
                        onClick={() => setActiveTab('issues')}
                        className={cn(
                            'flex-1 px-3 py-2 text-sm',
                            activeTab === 'issues'
                                ? isLight
                                    ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-b-2 border-blue-400 bg-blue-900/40 text-blue-100'
                                : isLight
                                  ? 'text-gray-700'
                                  : 'text-gray-200',
                        )}>
                        Issues Found ({activeEmails.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('dismissed')}
                        className={cn(
                            'flex-1 px-3 py-2 text-sm',
                            activeTab === 'dismissed'
                                ? isLight
                                    ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-b-2 border-blue-400 bg-blue-900/40 text-blue-100'
                                : isLight
                                  ? 'text-gray-700'
                                  : 'text-gray-200',
                        )}>
                        Dismissed ({dismissedEmails.length})
                    </button>
                </div>

                {/* Tab content */}
                <div
                    className={cn(
                        'mt-3 max-h-80 w-full overflow-auto rounded-lg p-2',
                        isLight ? 'bg-gray-50' : 'bg-gray-900/30',
                    )}>
                    {activeTab === 'issues' ? (
                        activeEmails.length === 0 ? (
                            <div
                                className={cn('py-6 text-center text-sm', isLight ? 'text-gray-500' : 'text-gray-300')}>
                                No issues found
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {activeEmails.map(item => (
                                    <li
                                        key={item.email}
                                        className={cn(
                                            'flex items-center justify-between rounded border p-2',
                                            isLight ? 'border-blue-200 bg-white' : 'border-blue-900 bg-gray-800',
                                        )}>
                                        <span className="font-mono text-xs">{item.email}</span>
                                        <span
                                            className={cn(
                                                'rounded px-2 py-0.5 text-[10px]',
                                                isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-800 text-blue-100',
                                            )}>
                                            active
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )
                    ) : dismissedEmails.length === 0 ? (
                        <div className={cn('py-6 text-center text-sm', isLight ? 'text-gray-500' : 'text-gray-300')}>
                            No dismissed emails
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {dismissedEmails.map(item => (
                                <li
                                    key={item.email}
                                    className={cn(
                                        'rounded border p-2',
                                        isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
                                    )}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs">{item.email}</span>
                                        <span
                                            className={cn(
                                                'rounded px-2 py-0.5 text-[10px]',
                                                isLight
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-yellow-800 text-yellow-100',
                                            )}>
                                            dismissed until{' '}
                                            {item.dismissedUntil ? new Date(item.dismissedUntil).toLocaleString() : '—'}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <p className="mb-4 text-sm text-gray-600">
                    This extension monitors ChatGPT prompts for email addresses and allows you to dismiss them for 24
                    hours.
                </p>
                <button
                    className={cn(
                        'mt-4 rounded px-4 py-1 font-bold shadow hover:scale-105',
                        isLight ? 'bg-blue-200 text-black' : 'bg-gray-700 text-white',
                    )}
                    onClick={injectContentScript}>
                    {t('injectButton')}
                </button>
                <ToggleButton>{t('toggleTheme')}</ToggleButton>
            </header>
        </div>
    );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
