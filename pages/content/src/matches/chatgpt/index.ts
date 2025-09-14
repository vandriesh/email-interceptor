import { emailStorage } from '@extension/storage';

console.log('[CEB] ChatGPT Email Monitor content script loaded. fooo!');

// Listen for UI messages
window.addEventListener('message', event => {
    console.log('[EmailMon] content/matches/pages message received:', event.data?.type);
    if (event.data?.type === 'PROCEED_WITH_SUBMISSION') {
        console.log('[EmailMon] PROCEED_WITH_SUBMISSION received');
        const promptEl = document.getElementById('prompt-textarea') as HTMLElement | null;
        const form = promptEl?.closest('form');
        const submitBtn = document.getElementById('composer-submit-button') as HTMLButtonElement | null;
        if (form) {
            form.submit();
        } else if (submitBtn) {
            submitBtn.click();
        } else {
            console.warn('[EmailMon] No form or submit button found to proceed');
        }
    } else if (event.data?.type === 'EMAIL_DISMISSED') {
        const email = event.data.email as string | undefined;
        console.log('[EmailMon] EMAIL_DISMISSED received', { email });
    }
});

// --- Selectors + helpers ---
const PROMPT_ID = 'prompt-textarea';
const SUBMIT_ID = 'composer-submit-button';
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

function getPromptEl(): HTMLElement | null {
    const el = document.getElementById(PROMPT_ID) as HTMLElement | null;
    const ok = !!el && el.isContentEditable;
    console.log('[EmailMon] getPromptEl:', { found: !!el, contentEditable: el?.isContentEditable });
    return ok ? el : null;
}

function getSubmitBtn(): HTMLButtonElement | null {
    const btn = document.getElementById(SUBMIT_ID) as HTMLButtonElement | null;
    console.log('[EmailMon] getSubmitBtn:', { found: !!btn });
    return btn;
}

function extractEmails(text: string): string[] {
    const matches = text.match(EMAIL_REGEX);
    const unique = matches ? Array.from(new Set(matches)) : [];
    console.log('[EmailMon] extractEmails:', { count: unique.length, emails: unique });
    return unique;
}

// --- Core submit handling (no blocking) ---
function handleSubmitSource(source: 'enter' | 'click', text?: string) {
    if (!text) {
        console.log('[EmailMon] handleSubmitSource: no text');
    }
    //
    console.log('[EmailMon] handleSubmitSource:', { source, textLen: text?.length });

    const emails = extractEmails(text);
    if (emails.length === 0) return;

    // Filter out dismissed (using your storage helper)
    const active = emails.filter(email => !emailStorage.isEmailDismissed(email));
    console.log('[EmailMon] filtered emails:', { activeCount: active.length, active });

    if (active.length === 0) return;

    // Store detections
    Promise.all(active.map(email => emailStorage.addDetectedEmail(email))).then(() => {
        console.log('[EmailMon] stored detections');
    });

    // Show modal (does NOT block submission)
    try {
        console.log('[EmailMon] post SHOW_EMAIL_MODAL', { active });
        window.postMessage({ type: 'SHOW_EMAIL_MODAL', emails: active }, '*');
    } catch (e) {
        console.error('[EmailMon] showEmailModal error:', e);
    }
}

// --- Wiring (prompt + dynamic submit button) ---
function wirePrompt(promptEl: HTMLElement) {
    console.log('[EmailMon] wirePrompt');

    // Enter to submit (without Shift) on contenteditable
    promptEl.addEventListener('keydown', e => {
        const text = promptEl.innerText || promptEl.textContent || '';
        console.log('[EmailMon] keydown Enter (no shift)', { text });
        if (e.key === 'Enter' && !e.shiftKey) {
            console.log('[EmailMon] keydown Enter (no shift)', { text });
            handleSubmitSource('enter', text);
        }
    });

    // Button can be dynamic → observe and (re)bind when it appears
    const bindButton = () => {
        const btn = getSubmitBtn();
        if (!btn) return;
        if (btn.dataset.emailMonBound === '1') return;

        console.log('[EmailMon] binding click to submit button');
        btn.addEventListener('click', () => {
            const text = promptEl.innerText || promptEl.textContent || '';
            console.log('[EmailMon] submit button click', { text });
            handleSubmitSource('click', text);
        });
        btn.dataset.emailMonBound = '1';
    };

    // Bind immediately if present
    bindButton();

    // Observe for the button appearing later
    const mo = new MutationObserver(() => bindButton());
    mo.observe(document.body, { childList: true, subtree: true });

    // When user types, button may appear → attempt re-bind
    promptEl.addEventListener('input', () => {
        console.log('[EmailMon] prompt input');
        bindButton();
    });
}

// --- Bootstrap ---
function init() {
    console.log('[EmailMon] init start v2');
    const tryInit = () => {
        const promptEl = getPromptEl();
        if (promptEl) {
            console.log('[EmailMon] prompt found → wiring');
            wirePrompt(promptEl);
            return true;
        }
        console.log('[EmailMon] prompt not found, retrying…');
        return false;
    };

    if (!tryInit()) {
        const mo = new MutationObserver(() => {
            if (tryInit()) mo.disconnect();
        });
        mo.observe(document.body, { childList: true, subtree: true });
    }

    // SPA navigation support
    let lastHref = location.href;
    const navMo = new MutationObserver(() => {
        if (location.href !== lastHref) {
            lastHref = location.href;
            console.log('[EmailMon] URL changed → re-init');
            tryInit();
        }
    });
    navMo.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
