const TOOL_KEYS = {
    outputType: "botDevTools.tools.generateBotReturnOutput.outputType",
    inputType: "botDevTools.tools.generateBotReturnOutput.inputType",
    preparationId: "botDevTools.tools.generateBotReturnOutput.preparationId",
    addEmptyValues: "botDevTools.tools.generateBotReturnOutput.addEmptyValues",
    // Custom JSON mode keys
    returnYear: "botDevTools.tools.generateBotReturnOutput.returnYear",
    returnType: "botDevTools.tools.generateBotReturnOutput.returnType",
    clientId: "botDevTools.tools.generateBotReturnOutput.clientId",
    version: "botDevTools.tools.generateBotReturnOutput.version",
    customJson: "botDevTools.tools.generateBotReturnOutput.customJson"
};

// Default JSON template (JSON5 format - single source of truth)
const DEFAULT_JSON = '{\n  persons: {},\n  importInformation: {},\n  documentsByType: {},\n  maxImportKey: {}\n}';

export async function renderGenerateBotReturnOutput(container, ctx) {
    const nowYear = new Date().getFullYear();
    const years = [];
    for (let y = 2022; y <= nowYear; y++) years.push(y);

    container.innerHTML = `
        <div class="card">
            <div class="hRow" style="margin-bottom:10px;">
                <button class="linkBtn" id="btnBack">← Back</button>
                <div style="font-weight:700;">Generate BOT Return Output</div>
                <div></div>
            </div>

            <div class="row">
                <label class="label">Output Type</label>
                <select id="outputType">
                    <option value="xml">CCH Tax Return XML</option>
                    <option value="json">BlackOre Preparation JSON</option>
                </select>
            </div>

            <!-- Input Type - only visible for CCH XML output -->
            <div class="row" id="inputTypeRow">
                <label class="label">Input Type</label>
                <select id="inputType">
                    <option value="preparation">By Preparation ID</option>
                    <option value="custom">Custom Preparation JSON By Return ID</option>
                </select>
            </div>

            <!-- Preparation ID input - for both JSON output and XML with preparation input -->
            <div class="row" id="preparationIdRow">
                <label class="label">Preparation ID <span style="color:#e74c3c;">*</span></label>
                <input class="input" id="preparationId" placeholder="e.g. 6970deca38b02048621fb246" autocomplete="off" />
            </div>

            <!-- Custom JSON section - only for XML output with custom input -->
            <div id="customJsonSection" style="display:none;">
                <div class="row" style="display:flex; gap:10px;">
                    <div style="flex:0 0 100px;">
                        <label class="label">Return Year</label>
                        <select id="returnYear">
                            ${years
                                .map((y) => `<option value="${y}" ${y === nowYear ? "selected" : ""}>${y}</option>`)
                                .join("")}
                        </select>
                    </div>
                    <div style="flex:1;">
                        <label class="label">Return Type</label>
                        <select id="returnType">
                            <option value="I" selected>Individual (I)</option>
                            <option value="P">Partnership (P)</option>
                        </select>
                    </div>
                </div>

                <div class="row" style="display:flex; gap:10px;">
                    <div style="flex:1;">
                        <label class="label">Client ID <span style="color:#e74c3c;">*</span></label>
                        <div class="typeahead">
                            <input class="input" id="clientId" placeholder="Start typing…" autocomplete="off" />
                            <div id="clientMenu" class="typeaheadMenu" style="display:none;"></div>
                        </div>
                    </div>
                    <div style="flex:0 0 70px;">
                        <label class="label">Version</label>
                        <input class="input" id="version" type="number" min="1" max="100" step="1" value="1" />
                    </div>
                </div>

                <div class="row">
                    <button type="button" class="toolBtn" id="btnOpenEditor">Open JSON Editor ↗</button>
                </div>
            </div>

            <!-- Add Empty Values - only for CCH XML output -->
            <div class="row" id="addEmptyValuesRow">
                <label class="checkboxLabel">
                    <input type="checkbox" id="addEmptyValues" checked />
                    <span>Add Empty Values</span>
                </label>
            </div>

            <div class="row" style="display:flex; gap:10px;">
                <button class="primary" id="btnGo" style="flex:1; width:auto; margin-top:0;">Generate & Go</button>
                <button class="toolBtn" id="btnResetTool" style="flex:0 0 70px; width:70px; margin:0;">Reset</button>
            </div>

            <div id="loadingRow" class="small" style="margin-top:10px; display:none;">
                ⏳ Loading…
            </div>

            <div id="errorRow" class="small" style="margin-top:10px; color:#e74c3c; display:none;"></div>

            <div class="row small">
                <div id="settingsHint"><b>Uses settings:</b> Integration Center API Base Path (⚙)</div>
                <div id="preview" style="margin-top:6px; word-break:break-all;"></div>
            </div>
        </div>
    `;

    container.querySelector("#btnBack").onclick = () => ctx.navigate("nav");

    const els = {
        outputType: container.querySelector("#outputType"),
        inputType: container.querySelector("#inputType"),
        inputTypeRow: container.querySelector("#inputTypeRow"),
        preparationId: container.querySelector("#preparationId"),
        preparationIdRow: container.querySelector("#preparationIdRow"),
        // Custom JSON mode
        customJsonSection: container.querySelector("#customJsonSection"),
        returnYear: container.querySelector("#returnYear"),
        returnType: container.querySelector("#returnType"),
        clientId: container.querySelector("#clientId"),
        clientMenu: container.querySelector("#clientMenu"),
        version: container.querySelector("#version"),
        btnOpenEditor: container.querySelector("#btnOpenEditor"),
        // Shared
        addEmptyValues: container.querySelector("#addEmptyValues"),
        addEmptyValuesRow: container.querySelector("#addEmptyValuesRow"),
        preview: container.querySelector("#preview"),
        settingsHint: container.querySelector("#settingsHint"),
        btnGo: container.querySelector("#btnGo"),
        errorRow: container.querySelector("#errorRow"),
    };

    async function loadSaved() {
        const saved = await chrome.storage.local.get(Object.values(TOOL_KEYS));

        // Handle migration from old values ("false"/"true" -> "xml"/"json")
        let outputType = saved[TOOL_KEYS.outputType];
        if (outputType === "false") outputType = "xml";
        else if (outputType === "true") outputType = "json";
        if (outputType && (outputType === "xml" || outputType === "json")) {
            els.outputType.value = outputType;
        }
        if (saved[TOOL_KEYS.inputType]) els.inputType.value = saved[TOOL_KEYS.inputType];
        if (saved[TOOL_KEYS.preparationId]) els.preparationId.value = saved[TOOL_KEYS.preparationId];
        if (saved[TOOL_KEYS.addEmptyValues] !== undefined) els.addEmptyValues.checked = saved[TOOL_KEYS.addEmptyValues];
        if (saved[TOOL_KEYS.returnYear]) els.returnYear.value = saved[TOOL_KEYS.returnYear];
        if (saved[TOOL_KEYS.returnType]) els.returnType.value = saved[TOOL_KEYS.returnType];
        if (saved[TOOL_KEYS.clientId]) els.clientId.value = saved[TOOL_KEYS.clientId];
        if (saved[TOOL_KEYS.version]) els.version.value = saved[TOOL_KEYS.version];

        // Set default JSON if none exists
        let jsonValue = saved[TOOL_KEYS.customJson];
        if (!jsonValue || !jsonValue.trim()) {
            await chrome.storage.local.set({ [TOOL_KEYS.customJson]: DEFAULT_JSON });
            jsonValue = DEFAULT_JSON;
        }

    }

    async function saveNow() {
        await chrome.storage.local.set({
            [TOOL_KEYS.outputType]: els.outputType.value,
            [TOOL_KEYS.inputType]: els.inputType.value,
            [TOOL_KEYS.preparationId]: els.preparationId.value,
            [TOOL_KEYS.addEmptyValues]: els.addEmptyValues.checked,
            [TOOL_KEYS.returnYear]: els.returnYear.value,
            [TOOL_KEYS.returnType]: els.returnType.value,
            [TOOL_KEYS.clientId]: els.clientId.value,
            [TOOL_KEYS.version]: els.version.value
            // customJson is only edited in the popup editor
        });
    }

    function isXmlOutput() {
        return els.outputType.value === "xml";
    }

    function isCustomJsonMode() {
        return isXmlOutput() && els.inputType.value === "custom";
    }

    function buildReturnId() {
        const year = els.returnYear.value;
        const type = els.returnType.value;
        const clientId = (els.clientId.value || "").trim();
        let versionNum = parseInt(els.version.value, 10);
        if (Number.isNaN(versionNum)) versionNum = 1;
        versionNum = Math.min(100, Math.max(1, versionNum));
        const version = `V${versionNum}`;
        return `${year}${type}:${clientId}:${version}`;
    }

    function buildUrl() {
        if (isCustomJsonMode()) {
            // Custom JSON mode - POST to CCH Gateway
            const cchGatewayApiBase = (ctx.globals.cchGatewayApiBase || "").replace(/\/$/, "");
            const returnId = buildReturnId();
            const addEmptyValues = els.addEmptyValues.checked;

            const params = new URLSearchParams({
                returnId: returnId,
                addEmptyValues: String(addEmptyValues),
                sendAsString: true
            });

            return `${cchGatewayApiBase}/api/json2xml?${params.toString()}`;
        } else {
            // Preparation ID mode - GET to Integration Center
            const integrationCenterApiBase = (ctx.globals.integrationCenterApiBase || "").replace(/\/$/, "");
            const preparationId = (els.preparationId.value || "").trim();
            const returnPreparation = isXmlOutput() ? "false" : "true";
            const addEmptyValues = els.addEmptyValues.checked;

            if (!preparationId) {
                return "";
            }

            const params = new URLSearchParams({
                returnPreparation: returnPreparation
            });

            // Only add addEmptyValues for XML output
            if (isXmlOutput()) {
                params.set("addEmptyValues", String(addEmptyValues));
            }

            return `${integrationCenterApiBase}/preparations/${preparationId}/generate-bot-return?${params.toString()}`;
        }
    }

    function updatePreview() {
        const url = buildUrl();
        if (isCustomJsonMode()) {
            els.preview.textContent = url ? `POST ${url}` : "(enter Client ID to see URL)";
        } else {
            els.preview.textContent = url || "(enter Preparation ID to see URL)";
        }
    }

    function updateSectionsVisibility() {
        const xmlOutput = isXmlOutput();
        const customMode = isCustomJsonMode();

        // Input Type row - only visible for CCH XML output
        els.inputTypeRow.style.display = xmlOutput ? "block" : "none";

        // Preparation ID row - visible for JSON output OR XML with preparation input
        els.preparationIdRow.style.display = customMode ? "none" : "block";

        // Custom JSON section - only for XML output with custom input
        els.customJsonSection.style.display = customMode ? "block" : "none";

        // Add Empty Values - only for CCH XML output
        els.addEmptyValuesRow.style.display = xmlOutput ? "block" : "none";

        // Update settings hint
        if (customMode) {
            els.settingsHint.innerHTML = "<b>Uses settings:</b> CCH Gateway API Base Path (⚙)";
        } else {
            els.settingsHint.innerHTML = "<b>Uses settings:</b> Integration Center API Base Path (⚙)";
        }
    }

    function hideError() {
        els.errorRow.style.display = "none";
        els.errorRow.textContent = "";
    }

    function showError(msg) {
        els.errorRow.style.display = "block";
        els.errorRow.textContent = msg;
    }

    // ------------------------------
    // Client typeahead (default list + debounced search)
    // API: /api/clients?entityId=...&search=...
    // Response: [{ id: "...", name: "..." }, ...]
    // ------------------------------

    let clientDebounceTimer = null;
    let clientAbortController = null;

    // Cache results by query; "" = default list
    const clientCache = new Map();

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function hideClientMenu() {
        els.clientMenu.style.display = "none";
        els.clientMenu.innerHTML = "";
    }

    function showClientMenu(items) {
        if (!Array.isArray(items) || items.length === 0) {
            hideClientMenu();
            return;
        }

        // Cap items shown
        const shown = items.slice(0, 30);

        els.clientMenu.innerHTML = shown.map((c) => {
            const id = c?.id ?? "";
            const name = c?.name ?? "";
            if (!id) return "";

            return `
                <div class="typeaheadItem" data-client-id="${escapeHtml(id)}">
                    <div>${escapeHtml(id)}</div>
                    ${name ? `<div class="typeaheadMuted">${escapeHtml(name)}</div>` : ``}
                </div>
            `;
        }).join("");

        els.clientMenu.style.display = "block";

        els.clientMenu.querySelectorAll("[data-client-id]").forEach((row) => {
            row.addEventListener("click", () => {
                els.clientId.value = row.dataset.clientId;
                hideClientMenu();
                updatePreview();
                saveNow();
            });
        });
    }

    function showClientMenuLoading(text) {
        els.clientMenu.style.display = "block";
        els.clientMenu.innerHTML = `
            <div class="typeaheadItem">
                <div class="typeaheadMuted">${escapeHtml(text)}</div>
            </div>
        `;
    }

    async function fetchClients(searchText) {
        const base = (ctx.globals.cchGatewayApiBase || "").replace(/\/$/, "");
        const entityId = (ctx.globals.entityId || "").trim();

        if (!base || !entityId) return [];

        const params = new URLSearchParams({
            entityId: entityId
        });

        if (searchText && searchText.trim()) {
            params.set("search", searchText.trim());
        }

        const url = `${base}/api/clients?${params.toString()}`;

        // Cancel previous request to avoid race conditions
        if (clientAbortController) clientAbortController.abort();
        clientAbortController = new AbortController();

        const res = await fetch(url, { signal: clientAbortController.signal });
        if (!res.ok) return [];

        const data = await res.json();

        // Expected shape: array of { id, name }
        return Array.isArray(data) ? data : [];
    }

    async function loadDefaultClients() {
        const cacheKey = "";
        if (clientCache.has(cacheKey)) {
            showClientMenu(clientCache.get(cacheKey));
            return;
        }

        showClientMenuLoading("Loading clients…");
        try {
            const items = await fetchClients("");
            clientCache.set(cacheKey, items);
            showClientMenu(items);
        } catch (e) {
            // ignore abort errors
            if (String(e).includes("AbortError")) return;
            hideClientMenu();
        }
    }

    async function searchClients(query) {
        const cacheKey = query.toLowerCase();
        if (clientCache.has(cacheKey)) {
            showClientMenu(clientCache.get(cacheKey));
            return;
        }

        showClientMenuLoading("Searching…");
        try {
            const items = await fetchClients(query);
            clientCache.set(cacheKey, items);
            showClientMenu(items);
        } catch (e) {
            if (String(e).includes("AbortError")) return;
            hideClientMenu();
        }
    }

    // ------------------------------

    function onAnyChange() {
        hideError();
        updateSectionsVisibility();
        updatePreview();
        saveNow();
    }

    // Event listeners
    ["change", "input"].forEach((evt) => {
        els.outputType.addEventListener(evt, onAnyChange);
        els.inputType.addEventListener(evt, onAnyChange);
        els.preparationId.addEventListener(evt, onAnyChange);
        els.addEmptyValues.addEventListener(evt, onAnyChange);
        els.returnYear.addEventListener(evt, onAnyChange);
        els.returnType.addEventListener(evt, onAnyChange);
        els.clientId.addEventListener(evt, onAnyChange);
        els.version.addEventListener(evt, onAnyChange);
    });

    // Client ID typeahead event listeners
    els.clientId.addEventListener("focus", () => {
        if (!els.clientId.value.trim()) {
            loadDefaultClients();
        }
    });

    els.clientId.addEventListener("input", () => {
        const q = els.clientId.value.trim();

        if (clientDebounceTimer) clearTimeout(clientDebounceTimer);

        if (!q) {
            loadDefaultClients();
            return;
        }

        // Require at least 2 chars to reduce noise
        if (q.length < 2) {
            hideClientMenu();
            return;
        }

        clientDebounceTimer = setTimeout(() => {
            searchClients(q);
        }, 700);
    });

    // Hide dropdown when clicking outside the tool content
    document.addEventListener("click", (e) => {
        if (!container.contains(e.target)) hideClientMenu();
    });

    // Open Editor button - opens a resizable popup window
    els.btnOpenEditor.onclick = async () => {
        // Save current state first so editor picks it up
        await saveNow();

        // Get current tab ID to pass to editor
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const targetTabId = currentTab?.id || "";

        // Open the JSON editor in a new popup window, passing the target tab ID
        chrome.windows.create({
            url: chrome.runtime.getURL("json-editor.html") + "?targetTab=" + targetTabId,
            type: "popup",
            width: 700,
            height: 650
        });

        // Close the main popup so editor stays independent
        window.close();
    };

    // Version blur handler
    els.version.addEventListener("blur", () => {
        let n = parseInt(els.version.value, 10);
        if (Number.isNaN(n)) n = 1;
        n = Math.min(100, Math.max(1, n));
        els.version.value = String(n);
        updatePreview();
    });

    // Reset button
    container.querySelector("#btnResetTool").onclick = async () => {
        await chrome.storage.local.remove(Object.values(TOOL_KEYS));

        // Set the default JSON
        await chrome.storage.local.set({
            [TOOL_KEYS.customJson]: DEFAULT_JSON
        });

        // Reset UI defaults
        els.outputType.value = "xml";
        els.inputType.value = "preparation";
        els.preparationId.value = "";
        els.addEmptyValues.checked = true;
        els.returnYear.value = String(nowYear);
        els.returnType.value = "I";
        els.clientId.value = "";
        els.version.value = "1";

        hideError();
        hideClientMenu();
        updateSectionsVisibility();
        updatePreview();
    };

    // Go button
    els.btnGo.onclick = async () => {
        try {
        hideError();

        // Get current tab ID first, before any async operations
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const targetTabId = currentTab?.id;

        if (isCustomJsonMode()) {
            // Custom JSON mode - validate and POST
            const clientId = (els.clientId.value || "").trim();
            if (!clientId) {
                showError("Client ID is required.");
                els.clientId.focus();
                return;
            }

            // Get JSON from storage (edited via popup editor)
            const stored = await chrome.storage.local.get(TOOL_KEYS.customJson);
            const jsonStr = (stored[TOOL_KEYS.customJson] || "").trim();

            if (!jsonStr) {
                showError("Preparation JSON is required. Click 'Open JSON Editor' to configure.");
                return;
            }

            // Validate JSON (using JSON5 for relaxed parsing)
            let userPreparation;
            try {
                userPreparation = JSON5.parse(jsonStr);
            } catch (e) {
                showError("Invalid JSON in editor: " + e.message);
                return;
            }

            const url = buildUrl();

            // Build the final payload - wrap user's JSON with preparation key
            const finalPayload = {
                preparation: userPreparation
            };

            // Show loader + disable button
            els.btnGo.disabled = true;
            els.btnGo.textContent = "Sending…";
            const loadingRow = container.querySelector("#loadingRow");
            if (loadingRow) loadingRow.style.display = "block";

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

                // Store XML and navigate to viewer
                await chrome.storage.local.set({ "botDevTools.tempXml": trimmedResponse });
                
                if (targetTabId) {
                    await chrome.tabs.update(targetTabId, { 
                        url: chrome.runtime.getURL("xml-viewer.html") 
                    });
                }
                window.close();
            } catch (e) {
                showError("Request failed: " + e.message);
                els.btnGo.disabled = false;
                els.btnGo.textContent = "Generate & Go";
                if (loadingRow) loadingRow.style.display = "none";
            }
        } else {
            // Preparation ID mode - navigate to URL
            const preparationId = (els.preparationId.value || "").trim();
            if (!preparationId) {
                showError("Preparation ID is required.");
                els.preparationId.focus();
                return;
            }

            const url = buildUrl();

            if (!targetTabId) {
                showError("Could not find target tab");
                return;
            }

            // Show loader + disable button
            els.btnGo.disabled = true;
            els.btnGo.textContent = "Navigating…";
            const loadingRow = container.querySelector("#loadingRow");
            if (loadingRow) loadingRow.style.display = "block";

            await chrome.tabs.update(targetTabId, { url });

            const onUpdated = (updatedTabId, info) => {
                if (updatedTabId !== targetTabId) return;
                if (info.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(onUpdated);
                    window.close();
                }
            };

            chrome.tabs.onUpdated.addListener(onUpdated);

            setTimeout(() => {
                try { chrome.tabs.onUpdated.removeListener(onUpdated); } catch {}
                try { window.close(); } catch {}
            }, 8000);
        }
        } catch (err) {
            showError("Unexpected error: " + err.message);
        }
    };

    await loadSaved();
    updateSectionsVisibility();
    updatePreview();
}
