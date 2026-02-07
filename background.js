// Background service worker - injects XML blob and tracks scroll

const STORAGE_KEY = "botDevTools.tempXml";
const SCROLL_KEY = "botDevTools.xmlScrollPosition";
const READY_KEY = "botDevTools.xmlReady";
const HOST_KEY = "botDevTools.cchGatewayApiBase";

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url) return;

    // Step 1: Host page loaded - inject script to create blob and navigate
    if (!tab.url.startsWith("blob:")) {
        const stored = await chrome.storage.local.get([READY_KEY, STORAGE_KEY, HOST_KEY]);
        
        if (!stored[READY_KEY] || !stored[STORAGE_KEY]) return;
        
        const hostBase = (stored[HOST_KEY] || "https://example.com").replace(/\/$/, "");
        
        if (tab.url.startsWith(hostBase)) {
            const xml = stored[STORAGE_KEY];
            
            // Clear ready flag and XML
            await chrome.storage.local.remove([READY_KEY, STORAGE_KEY]);
            
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: (xmlContent) => {
                        // Clear page immediately for smooth transition
                        document.body.innerHTML = '';
                        document.body.style.background = '#fff';
                        
                        const blob = new Blob([xmlContent], { type: "application/xml" });
                        const blobUrl = URL.createObjectURL(blob);
                        window.location.href = blobUrl;
                    },
                    args: [xml]
                });
            } catch (err) {
                console.error("[Background] Failed to create blob:", err.message);
            }
        }
        return;
    }
    
    // Step 2: Blob page loaded (with web origin) - inject scroll tracker
    if (tab.url.startsWith("blob:http")) {
        const stored = await chrome.storage.local.get(SCROLL_KEY);
        const savedScroll = stored[SCROLL_KEY] || 0;
        
        try {
            // Inject scroll logic (content script already hid the body at document_start)
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (scrollKey, savedScrollPos) => {
                    // Scroll while hidden
                    if (savedScrollPos > 0) {
                        window.scrollTo({ top: savedScrollPos, behavior: 'instant' });
                    }
                    
                    // Reveal by clearing the hide styles
                    document.documentElement.style.removeProperty('opacity');
                    document.documentElement.style.removeProperty('visibility');
                    
                    // Track scroll
                    let timeout;
                    window.addEventListener("scroll", () => {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => {
                            chrome.storage.local.set({ [scrollKey]: window.scrollY });
                        }, 200);
                    });
                },
                args: [SCROLL_KEY, savedScroll]
            });
        } catch (err) {
            // Scroll injection failed - not critical
        }
    }
});
