const TOOL_KEYS = {
    outputType: "botDevTools.tools.generateReturnOutput.outputType",
    returnYear: "botDevTools.tools.generateReturnOutput.returnYear",
    returnType: "botDevTools.tools.generateReturnOutput.returnType",
    clientId: "botDevTools.tools.generateReturnOutput.clientId",
    version: "botDevTools.tools.generateReturnOutput.version"
};

export async function renderGenerateCchReturnOutput(container, ctx) {
    const nowYear = new Date().getFullYear();
    const years = [];
    for (let y = 2022; y <= nowYear; y++) years.push(y);

    container.innerHTML = `
        <div class="card">
            <div class="hRow" style="margin-bottom:10px;">
                <button class="linkBtn" id="btnBack">← Back</button>
                <div style="font-weight:700;">Generate CCH Return Output</div>
                <div></div>
            </div>

            <div class="row">
                <label class="label">Output Type</label>
                <select id="outputType">
                    <option value="xml">CCH XML (raw)</option>
                    <option value="blackore">BlackOre JSON (import from CCH XML)</option>
                    <option value="cch_json">CCH JSON (export structure)</option>
                </select>
            </div>

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
                    <label class="label">Client ID</label>
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

            <div class="row" style="display:flex; gap:10px;">
                <button class="primary" id="btnGo" style="flex:1; width:auto; margin-top:0;">Generate & Go</button>
                <button class="toolBtn" id="btnResetTool" style="flex:0 0 70px; width:70px; margin:0;">Reset</button>
            </div>

            <div id="loadingRow" class="small" style="margin-top:10px; display:none;">
                ⏳ Loading…
            </div>

            <div class="row small">
                <div><b>Uses settings:</b> CCH Gateway API Base Path + Entity ID (⚙)</div>
                <div id="preview" style="margin-top:6px;"></div>
            </div>
        </div>
    `;

    container.querySelector("#btnBack").onclick = () => ctx.navigate("nav");

    const els = {
        outputType: container.querySelector("#outputType"),
        returnYear: container.querySelector("#returnYear"),
        returnType: container.querySelector("#returnType"),
        clientId: container.querySelector("#clientId"),
        clientMenu: container.querySelector("#clientMenu"),
        version: container.querySelector("#version"),
        preview: container.querySelector("#preview"),
        btnGo: container.querySelector("#btnGo"),
    };

    async function loadSaved() {
        const saved = await chrome.storage.local.get(Object.values(TOOL_KEYS));

        if (saved[TOOL_KEYS.outputType]) els.outputType.value = saved[TOOL_KEYS.outputType];
        if (saved[TOOL_KEYS.returnYear]) els.returnYear.value = saved[TOOL_KEYS.returnYear];
        if (saved[TOOL_KEYS.returnType]) els.returnType.value = saved[TOOL_KEYS.returnType];
        if (saved[TOOL_KEYS.clientId]) els.clientId.value = saved[TOOL_KEYS.clientId];
        if (saved[TOOL_KEYS.version]) els.version.value = saved[TOOL_KEYS.version];
    }

    async function saveNow() {
        await chrome.storage.local.set({
            [TOOL_KEYS.outputType]: els.outputType.value,
            [TOOL_KEYS.returnYear]: els.returnYear.value,
            [TOOL_KEYS.returnType]: els.returnType.value,
            [TOOL_KEYS.clientId]: els.clientId.value,
            [TOOL_KEYS.version]: els.version.value
        });
    }

    function buildUrl() {
        const cchGatewayApiBase = (ctx.globals.cchGatewayApiBase || "").replace(/\/$/, "");
        const entityId = (ctx.globals.entityId || "").trim();

        const year = els.returnYear.value;
        const type = els.returnType.value; // I or P
        const clientId = (els.clientId.value || "").trim();

        let versionNum = parseInt(els.version.value, 10);
        if (Number.isNaN(versionNum)) versionNum = 1;
        versionNum = Math.min(100, Math.max(1, versionNum));
        const version = `V${versionNum}`;

        const output = els.outputType.value; // xml | blackore
        const returnId = `${year}${type}:${clientId}:${version}`;

        const basePath = `${cchGatewayApiBase}/api/tax_returns/${returnId}`;
        const qs = `?entityId=${encodeURIComponent(entityId)}`;

        let url;
        if (output === "cch_json") {
            url = `${basePath}${qs}`;              // no suffix
        } else {
            url = `${basePath}/${output}${qs}`;    // /xml or /blackore
        }
        return url;

    }

    function updatePreview() {
        const url = buildUrl();
        els.preview.textContent = url;
    }

    function onAnyChange() {
        updatePreview();
        saveNow();
    }

    ["change", "input"].forEach((evt) => {
        els.outputType.addEventListener(evt, onAnyChange);
        els.returnYear.addEventListener(evt, onAnyChange);
        els.returnType.addEventListener(evt, onAnyChange);
        els.clientId.addEventListener(evt, onAnyChange);
        els.version.addEventListener(evt, onAnyChange);
    });

    container.querySelector("#btnResetTool").onclick = async () => {
        await chrome.storage.local.remove(Object.values(TOOL_KEYS));

        // reset UI defaults
        els.outputType.value = "xml";
        els.returnYear.value = String(nowYear);
        els.returnType.value = "I";
        els.clientId.value = "";
        els.version.value = "1";

        hideClientMenu();

        updatePreview();
    };

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

    // Show default list when focusing the field (only if empty)
    els.clientId.addEventListener("focus", () => {
        if (!els.clientId.value.trim()) {
            loadDefaultClients();
        }
    });

    // On typing: debounce 700ms; if empty -> default list
    els.clientId.addEventListener("input", () => {
        const q = els.clientId.value.trim();

        if (clientDebounceTimer) clearTimeout(clientDebounceTimer);

        if (!q) {
            loadDefaultClients();
            return;
        }

        // Optional: require at least 2 chars to reduce noise
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

    // ------------------------------

    els.btnGo.onclick = async () => {
        const url = buildUrl();

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        // Show loader + disable button
        els.btnGo.disabled = true;
        els.btnGo.textContent = "Navigating…";
        const loadingRow = container.querySelector("#loadingRow");
        if (loadingRow) loadingRow.style.display = "block";

        await chrome.tabs.update(tab.id, { url });

        const targetTabId = tab.id;

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
    };

    els.version.addEventListener("blur", () => {
        let n = parseInt(els.version.value, 10);
        if (Number.isNaN(n)) n = 1;
        n = Math.min(100, Math.max(1, n));
        els.version.value = String(n);
        updatePreview();
    });

    await loadSaved();
    updatePreview();
}
