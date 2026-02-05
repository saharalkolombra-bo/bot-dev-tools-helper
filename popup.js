import { renderGenerateReturnOutput } from "./tools/generate-return-output.js";

const DEFAULTS = {
  cchGatewayApiBase: "http://localhost:7101",
  entityId: "6889b995442d224445bcccbf"
};

const KEYS = {
  cchGatewayApiBase: "botDevTools.cchGatewayApiBase",
  entityId: "botDevTools.entityId"
};

// Tools registry (Option A: imported render functions)
const TOOLS = [
  {
    id: "generate-return-output",
    name: "Generate Return Output",
    render: renderGenerateReturnOutput
  },
  {
    id: "coming-soon",
    name: "Coming Soon..."
  }
];

const app = document.getElementById("app");
document.getElementById("btnSettings").addEventListener("click", () => navigate("settings"));

function navigate(view, params = {}) {
  state.view = view;
  state.params = params;
  render();
}

const state = { view: "nav", params: {} };

async function getGlobals() {
  const cchGatewayApiBase = (await chrome.storage.local.get(KEYS.cchGatewayApiBase))[KEYS.cchGatewayApiBase] ?? DEFAULTS.cchGatewayApiBase;
  const entityId = (await chrome.storage.local.get(KEYS.entityId))[KEYS.entityId] ?? DEFAULTS.entityId;
  return { cchGatewayApiBase, entityId };
}

async function setGlobals(next) {
  await chrome.storage.local.set({
    [KEYS.cchGatewayApiBase]: next.cchGatewayApiBase,
    [KEYS.entityId]: next.entityId
  });
}

function renderNav() {
  app.innerHTML = `
    <div class="card">
      <div class="hRow" style="margin-bottom:10px;">
        <div style="font-weight:700;">Tools</div>
        <div class="small">⚙ for globals</div>
      </div>
      ${TOOLS.map(
        (t) => `<button class="toolBtn" data-tool="${t.id}">${t.name}</button>`
      ).join("")}
    </div>
  `;

  app.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => navigate("tool", { toolId: btn.dataset.tool }));
  });
}

async function renderSettings() {
  const globals = await getGlobals();

  app.innerHTML = `
    <div class="card">
      <div class="hRow" style="margin-bottom:10px;">
        <button class="linkBtn" id="btnBack">← Back</button>
        <div style="font-weight:700;">Settings</div>
        <div></div>
      </div>

      <div class="row">
        <label class="label">CCH Gateway API Base Path</label>
        <input class="input" id="cchGatewayApiBase" value="${escapeHtml(globals.cchGatewayApiBase)}" />
      </div>

      <div class="row">
        <label class="label">Entity ID</label>
        <input class="input" id="entityId" value="${escapeHtml(globals.entityId)}" />
      </div>

      <button class="primary" id="btnSave">Save</button>
      <button class="toolBtn" id="btnReset" style="margin-top:10px;">Reset to Defaults</button>

      <div class="small" style="margin-top:10px;">
        Saved in chrome.storage.local
      </div>
    </div>
  `;

  document.getElementById("btnBack").onclick = () => navigate("nav");

  document.getElementById("btnSave").onclick = async () => {
    const cchGatewayApiBase = document.getElementById("cchGatewayApiBase").value.trim() || DEFAULTS.cchGatewayApiBase;
    const entityId = document.getElementById("entityId").value.trim();
    await setGlobals({ cchGatewayApiBase, entityId });
    navigate("nav");
  };

  document.getElementById("btnReset").onclick = async () => {
    await setGlobals({ ...DEFAULTS });
    navigate("settings");
  };
}

async function renderTool() {
  const toolId = state.params.toolId;
  const tool = TOOLS.find((t) => t.id === toolId);

  if (!tool) {
    app.innerHTML = `<div class="card">Tool not found.</div>`;
    return;
  }

  const globals = await getGlobals();

  // tool.render receives a container + helpers
  await tool.render(app, {
    globals,
    navigate,
    setGlobals, // available if some tools ever want to tweak globals
  });
}

function render() {
    document.body.classList.remove("view-nav", "view-tool", "view-settings");
  
    if (state.view === "nav") {
      document.body.classList.add("view-nav");
      return renderNav();
    }
    if (state.view === "settings") {
      document.body.classList.add("view-settings");
      return renderSettings();
    }
    if (state.view === "tool") {
      document.body.classList.add("view-tool");
      return renderTool();
    }
  
    document.body.classList.add("view-nav");
    renderNav();
}  

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
