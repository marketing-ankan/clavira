import { useLocation } from 'react-router-dom';

/** Floating WhatsApp enquiry button — hidden on admin routes and if no number is set. */
export default function WhatsAppButton() {
    const { pathname } = useLocation();
    const number = window.__CLAVIRA?.whatsapp;

    if (!number || pathname.startsWith('/admin')) return null;

    const text = encodeURIComponent('Hello Clavira, I would like to know more about your jewellery.');
    const href = `https://wa.me/${number}?text=${text}`;

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="fixed bottom-5 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:scale-105 transition-transform"
        >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2zm0 18.3c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.3 8.3 0 1 1 12 20.3z"/>
            </svg>
        </a>
    );
}
