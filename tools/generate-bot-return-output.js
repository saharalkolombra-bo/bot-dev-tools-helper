const TOOL_KEYS = {
    outputType: "botDevTools.tools.generateBotReturnOutput.outputType",
    preparationId: "botDevTools.tools.generateBotReturnOutput.preparationId",
    addEmptyValues: "botDevTools.tools.generateBotReturnOutput.addEmptyValues"
};

export async function renderGenerateBotReturnOutput(container, ctx) {
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
                    <option value="false">CCH Tax Return XML</option>
                    <option value="true">BlackOre Preparation JSON</option>
                </select>
            </div>

            <div class="row">
                <label class="label">Preparation ID <span style="color:#e74c3c;">*</span></label>
                <input class="input" id="preparationId" placeholder="e.g. 6970deca38b02048621fb246" autocomplete="off" />
            </div>

            <div class="row" id="addEmptyValuesRow">
                <label class="checkboxLabel">
                    <input type="checkbox" id="addEmptyValues" checked />
                    <span>Add Empty Values</span>
                </label>
            </div>

            <button class="primary" id="btnGo">Generate & Go</button>
            <button class="toolBtn" id="btnResetTool" style="margin-top:10px;">Reset Tool Settings</button>

            <div id="loadingRow" class="small" style="margin-top:10px; display:none;">
                ⏳ Loading…
            </div>

            <div id="errorRow" class="small" style="margin-top:10px; color:#e74c3c; display:none;"></div>

            <div class="row small">
                <div><b>Uses settings:</b> Integration Center API Base Path (⚙)</div>
                <div id="preview" style="margin-top:6px; word-break:break-all;"></div>
            </div>
        </div>
    `;

    container.querySelector("#btnBack").onclick = () => ctx.navigate("nav");

    const els = {
        outputType: container.querySelector("#outputType"),
        preparationId: container.querySelector("#preparationId"),
        addEmptyValues: container.querySelector("#addEmptyValues"),
        addEmptyValuesRow: container.querySelector("#addEmptyValuesRow"),
        preview: container.querySelector("#preview"),
        btnGo: container.querySelector("#btnGo"),
        errorRow: container.querySelector("#errorRow"),
    };

    async function loadSaved() {
        const saved = await chrome.storage.local.get(Object.values(TOOL_KEYS));

        if (saved[TOOL_KEYS.outputType]) els.outputType.value = saved[TOOL_KEYS.outputType];
        if (saved[TOOL_KEYS.preparationId]) els.preparationId.value = saved[TOOL_KEYS.preparationId];
        if (saved[TOOL_KEYS.addEmptyValues] !== undefined) els.addEmptyValues.checked = saved[TOOL_KEYS.addEmptyValues];
    }

    async function saveNow() {
        await chrome.storage.local.set({
            [TOOL_KEYS.outputType]: els.outputType.value,
            [TOOL_KEYS.preparationId]: els.preparationId.value,
            [TOOL_KEYS.addEmptyValues]: els.addEmptyValues.checked
        });
    }

    function buildUrl() {
        const integrationCenterApiBase = (ctx.globals.integrationCenterApiBase || "").replace(/\/$/, "");
        const preparationId = (els.preparationId.value || "").trim();
        const returnPreparation = els.outputType.value; // "true" or "false"
        const addEmptyValues = els.addEmptyValues.checked;

        if (!preparationId) {
            return "";
        }

        const params = new URLSearchParams({
            addEmptyValues: String(addEmptyValues),
            returnPreparation: returnPreparation
        });

        const url = `${integrationCenterApiBase}/preparations/${preparationId}/generate-bot-return?${params.toString()}`;

        return url;
    }

    function updatePreview() {
        const url = buildUrl();
        els.preview.textContent = url || "(enter Preparation ID to see URL)";
    }

    function updateAddEmptyValuesVisibility() {
        // Hide "Add Empty Values" when output type is BlackOre Preparation JSON (returnPreparation=true)
        const isPreparationJson = els.outputType.value === "true";
        els.addEmptyValuesRow.style.display = isPreparationJson ? "none" : "block";
    }

    function hideError() {
        els.errorRow.style.display = "none";
        els.errorRow.textContent = "";
    }

    function showError(msg) {
        els.errorRow.style.display = "block";
        els.errorRow.textContent = msg;
    }

    function onAnyChange() {
        hideError();
        updateAddEmptyValuesVisibility();
        updatePreview();
        saveNow();
    }

    ["change", "input"].forEach((evt) => {
        els.outputType.addEventListener(evt, onAnyChange);
        els.preparationId.addEventListener(evt, onAnyChange);
        els.addEmptyValues.addEventListener(evt, onAnyChange);
    });

    container.querySelector("#btnResetTool").onclick = async () => {
        await chrome.storage.local.remove(Object.values(TOOL_KEYS));

        // reset UI defaults
        els.outputType.value = "false";
        els.preparationId.value = "";
        els.addEmptyValues.checked = true;

        hideError();
        updateAddEmptyValuesVisibility();
        updatePreview();
    };

    els.btnGo.onclick = async () => {
        hideError();

        const preparationId = (els.preparationId.value || "").trim();
        if (!preparationId) {
            showError("Preparation ID is required.");
            els.preparationId.focus();
            return;
        }

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

    await loadSaved();
    updateAddEmptyValuesVisibility();
    updatePreview();
}
