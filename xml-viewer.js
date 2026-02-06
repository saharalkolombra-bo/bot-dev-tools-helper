// XML Viewer - reads XML from chrome.storage and displays it using native browser rendering

(async function() {
    const STORAGE_KEY = "botDevTools.tempXml";

    try {
        // Get XML from storage
        const stored = await chrome.storage.local.get(STORAGE_KEY);
        const xml = stored[STORAGE_KEY];

        if (!xml) {
            document.body.innerHTML = '<p style="font-family: system-ui; padding: 20px;">No XML content found.</p>';
            return;
        }

        // Clear the stored XML (one-time use)
        await chrome.storage.local.remove(STORAGE_KEY);

        // Create blob URL and navigate to it - browser will render XML natively
        const blob = new Blob([xml], { type: "application/xml" });
        const blobUrl = URL.createObjectURL(blob);
        window.location.href = blobUrl;

    } catch (err) {
        document.body.innerHTML = '<p style="font-family: system-ui; padding: 20px; color: red;">Error: ' + err.message + '</p>';
    }
})();
