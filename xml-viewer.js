// XML Viewer - navigates to CCH gateway host, then creates blob for native XML rendering

(async function() {
    const STORAGE_KEY = "botDevTools.tempXml";
    const READY_KEY = "botDevTools.xmlReady";
    const HOST_KEY = "botDevTools.cchGatewayApiBase";

    try {
        const stored = await chrome.storage.local.get([STORAGE_KEY, HOST_KEY]);
        const xml = stored[STORAGE_KEY];

        if (!xml) {
            document.body.innerHTML = '<p style="font-family: system-ui; padding: 20px;">No XML content found.</p>';
            return;
        }

        // Mark XML as ready for injection
        await chrome.storage.local.set({ [READY_KEY]: true });

        // Get CCH gateway host (fallback to example.com)
        const hostBase = (stored[HOST_KEY] || "https://example.com").replace(/\/$/, "");

        // Navigate to host - background.js will create blob and inject scroll tracker
        window.location.href = hostBase;

    } catch (err) {
        document.body.innerHTML = '<p style="font-family: system-ui; padding: 20px; color: red;">Error: ' + err.message + '</p>';
    }
})();
