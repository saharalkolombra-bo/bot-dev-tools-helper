// Content script that runs at document_start on blob pages
// Hides content as early as possible

(function() {
    // Only run on blob:http URLs (web-origin blobs)
    if (!location.href.startsWith("blob:http")) return;
    
    // Wait for documentElement to exist, then hide it
    const hide = () => {
        if (document.documentElement) {
            document.documentElement.style.setProperty('opacity', '0', 'important');
            document.documentElement.style.setProperty('visibility', 'hidden', 'important');
            return true;
        }
        return false;
    };
    
    // Try immediately
    if (!hide()) {
        // If not ready, use MutationObserver to catch it ASAP
        const observer = new MutationObserver(() => {
            if (hide()) {
                observer.disconnect();
            }
        });
        observer.observe(document, { childList: true, subtree: true });
    }
})();
