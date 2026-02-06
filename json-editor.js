const TOOL_KEYS = {
    customJson: "botDevTools.tools.generateBotReturnOutput.customJson",
    returnYear: "botDevTools.tools.generateBotReturnOutput.returnYear",
    returnType: "botDevTools.tools.generateBotReturnOutput.returnType",
    clientId: "botDevTools.tools.generateBotReturnOutput.clientId",
    version: "botDevTools.tools.generateBotReturnOutput.version",
    addEmptyValues: "botDevTools.tools.generateBotReturnOutput.addEmptyValues"
};

const GLOBAL_KEYS = {
    cchGatewayApiBase: "botDevTools.cchGatewayApiBase"
};

document.addEventListener("DOMContentLoaded", async () => {

    const els = {
        customJson: document.getElementById("customJson"),
        errorRow: document.getElementById("errorRow"),
        btnFormat: document.getElementById("btnFormat"),
        btnSave: document.getElementById("btnSave"),
        btnGenerate: document.getElementById("btnGenerate")
    };

    async function loadSaved() {
        const saved = await chrome.storage.local.get(TOOL_KEYS.customJson);
        const jsonValue = saved[TOOL_KEYS.customJson];
        // Just use whatever is in storage (main tool initializes the default)
        els.customJson.value = jsonValue || '';
    }

    async function saveNow() {
        await chrome.storage.local.set({
            [TOOL_KEYS.customJson]: els.customJson.value
        });
    }

    function hideError() {
        els.errorRow.style.display = "none";
        els.errorRow.textContent = "";
    }

    function showError(msg) {
        els.errorRow.style.display = "block";
        els.errorRow.textContent = msg;
    }

    // Parse JSON5 and return standard object, or null on error
    function parseJson5(str) {
        try {
            // JSON5 is loaded globally from CDN
            return JSON5.parse(str);
        } catch (e) {
            showError("Invalid JSON: " + e.message);
            return null;
        }
    }

    // Auto-save on input
    els.customJson.addEventListener("input", () => {
        hideError();
        saveNow();
    });

    // Format JSON button - parse with JSON5, output as JSON5 (unquoted keys)
    els.btnFormat.onclick = () => {
        const raw = els.customJson.value.trim();
        if (!raw) return;

        const parsed = parseJson5(raw);
        if (parsed !== null) {
            els.customJson.value = JSON5.stringify(parsed, null, 2);
            hideError();
            saveNow();
        }
    };

    // Save & Close button
    els.btnSave.onclick = async () => {
        const raw = els.customJson.value.trim();

        // Validate JSON before closing
        if (raw) {
            const parsed = parseJson5(raw);
            if (parsed === null) return; // Error already shown
        }

        await saveNow();
        window.close();
    };

    // Save & Generate button - save, validate, and make the POST request
    els.btnGenerate.onclick = async () => {
        hideError();

        const raw = els.customJson.value.trim();
        if (!raw) {
            showError("JSON is required.");
            return;
        }

        // Parse with JSON5
        const userPreparation = parseJson5(raw);
        if (userPreparation === null) return; // Error already shown

        // Save the JSON
        await saveNow();

        // Get other settings from storage
        const stored = await chrome.storage.local.get([
            ...Object.values(TOOL_KEYS),
            ...Object.values(GLOBAL_KEYS)
        ]);

        const cchGatewayApiBase = (stored[GLOBAL_KEYS.cchGatewayApiBase] || "http://localhost:7101").replace(/\/$/, "");

        // Build return ID
        const year = stored[TOOL_KEYS.returnYear] || new Date().getFullYear();
        const type = stored[TOOL_KEYS.returnType] || "I";
        const clientId = (stored[TOOL_KEYS.clientId] || "").trim();
        let versionNum = parseInt(stored[TOOL_KEYS.version], 10);
        if (Number.isNaN(versionNum)) versionNum = 1;
        versionNum = Math.min(100, Math.max(1, versionNum));
        const version = `V${versionNum}`;
        const returnId = `${year}${type}:${clientId}:${version}`;

        // Check if client ID is set
        if (!clientId) {
            showError("Client ID is not configured. Set it in the main tool window first.");
            return;
        }

        const addEmptyValues = stored[TOOL_KEYS.addEmptyValues] !== false; // Default true

        // Build URL
        const params = new URLSearchParams({
            returnId: returnId,
            addEmptyValues: String(addEmptyValues),
            sendAsString: "true"
        });
        const url = `${cchGatewayApiBase}/api/json2xml?${params.toString()}`;

        // Build payload
        const finalPayload = {
            preparation: userPreparation
        };

        // Disable button and show loading
        els.btnGenerate.disabled = true;
        els.btnGenerate.textContent = "Generating…";

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(finalPayload)
            });

            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${responseText}`);
            }

            // Check if response looks like XML
            const trimmedResponse = responseText.trim();
            if (!trimmedResponse.startsWith("<")) {
                // Not XML - show as error (might be JSON error response)
                let errorMsg = trimmedResponse;
                try {
                    const errorJson = JSON.parse(trimmedResponse);
                    errorMsg = errorJson.message || errorJson.error || JSON.stringify(errorJson, null, 2);
                } catch (e) {
                    // Not JSON, use as-is
                }
                throw new Error("Server did not return XML: " + errorMsg);
            }

            // Valid XML - store and navigate to viewer (works from any page)
            await chrome.storage.local.set({ "botDevTools.tempXml": trimmedResponse });
            
            // Get target tab ID from URL parameter (passed when editor was opened)
            const urlParams = new URLSearchParams(window.location.search);
            const targetTabId = parseInt(urlParams.get("targetTab"), 10);
            
            if (targetTabId) {
                await chrome.tabs.update(targetTabId, { 
                    url: chrome.runtime.getURL("xml-viewer.html") 
                });
                // Focus the window containing that tab
                const tabInfo = await chrome.tabs.get(targetTabId);
                if (tabInfo?.windowId) {
                    await chrome.windows.update(tabInfo.windowId, { focused: true });
                }
            }

            // Small delay then close
            setTimeout(() => window.close(), 100);
        } catch (e) {
            showError("Request failed: " + e.message);
            els.btnGenerate.disabled = false;
            els.btnGenerate.textContent = "Save & Generate";
        }
    };

    // Handle Tab key in textarea for indentation
    els.customJson.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const start = els.customJson.selectionStart;
            const end = els.customJson.selectionEnd;
            const value = els.customJson.value;

            // Insert 2 spaces
            els.customJson.value = value.substring(0, start) + "  " + value.substring(end);
            els.customJson.selectionStart = els.customJson.selectionEnd = start + 2;
            saveNow();
        }
    });

    // Save on window close
    window.addEventListener("beforeunload", () => {
        saveNow();
    });

    // Initialize
    await loadSaved();
});
