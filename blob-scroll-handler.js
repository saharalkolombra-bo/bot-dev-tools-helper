// Content script that runs at document_start on blob pages
// Hides content as early as possible for smoother scroll restore

(function() {
    // Only run on blob:http URLs (web-origin blobs)
    if (!location.href.startsWith("blob:http")) return;
    
    // Try to hide documentElement - wrapped in try-catch since timing can be tricky
    const hide = () => {
        try {
            if (document.documentElement && document.documentElement.style) {
                document.documentElement.style.setProperty('opacity', '0', 'important');
                document.documentElement.style.setProperty('visibility', 'hidden', 'important');
                return true;
            }
        } catch (e) {
            // Ignore - background.js will still handle scroll
        }
        return false;
    };
    
    // Try immediately
    if (!hide()) {
        // If not ready, use MutationObserver to catch it ASAP
        try {
            const observer = new MutationObserver(() => {
                if (hide()) {
                    observer.disconnect();
                }
            });
            observer.observe(document, { childList: true, subtree: true });
        } catch (e) {
            // Ignore
        }
    }
})();
