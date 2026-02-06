# BOT Dev Tools Helper

A lightweight Chrome extension that provides internal developer tools
for working with BOT / BlackOre APIs.

This extension is designed for **internal use** by developers to speed
up common workflows such as generating return output endpoints,
navigating APIs, and debugging integrations.

> ⚠️ This is **not** a production extension and is **not intended for
> the Chrome Web Store**.

------------------------------------------------------------------------

## Features

### Generate CCH Return Output

Quickly build and navigate to CCH Gateway return output endpoints.

-   Supports:
    -   **CCH XML** (raw)
    -   **BlackOre JSON** (import from CCH XML)
    -   **CCH JSON** (export structure)
-   Input-driven Return ID builder:
    -   Return Year
    -   Return Type (Individual / Partnership)
    -   Client ID (typeahead search)
    -   Version (1--100)
-   Automatically navigates the current tab to the generated endpoint

### Generate BOT Return Output

Generate return output from BlackOre Integration Center APIs.

-   **Output Types:**
    -   **CCH Tax Return XML** - Generate XML from preparation data
    -   **BlackOre Preparation JSON** - Fetch raw preparation JSON
-   **Input Modes** (for CCH XML output):
    -   **By Preparation ID** - Use an existing preparation ID
    -   **Custom Preparation JSON By Return ID** - Build return ID and provide custom JSON
-   **Advanced JSON Editor:**
    -   Opens in a separate, resizable popup window
    -   Syntax highlighting with CodeMirror
    -   Collapsible JSON sections (fold/unfold)
    -   Line numbers and bracket matching
    -   JSON5 support (unquoted keys, trailing commas)
    -   Format JSON button
    -   Save & Generate directly from editor
    -   **Keyboard shortcuts:**
        -   `Cmd/Ctrl+F` - Search
        -   `Cmd/Ctrl+G` - Find next
        -   `Cmd/Ctrl+Shift+G` - Find previous
        -   `Cmd/Ctrl+H` - Search & Replace
        -   `Cmd/Ctrl+Z` - Undo
        -   `Cmd/Ctrl+Shift+Z` - Redo
        -   `Tab` - Indent
-   **Add Empty Values** checkbox for XML generation

### Client ID Typeahead

-   Fetches a default client list on focus
-   Debounced search (700ms) when typing
-   Displays client ID + client name
-   Handles large client lists efficiently

### Global Settings

-   Configurable **CCH Gateway API Base Path**
-   Configurable **Integration Center API Base Path**
-   Global **Entity ID**
-   Settings persist via `chrome.storage.local`

------------------------------------------------------------------------

## Why this exists

This tool exists to remove friction from repetitive dev tasks:
- No more manually crafting return URLs
- No more copy/paste between tools
- Faster iteration when testing APIs (local, QA, etc.)

It's intentionally simple, opinionated, and optimized for daily
developer use.

------------------------------------------------------------------------

## Installation (Local)

1.  Clone the repository:

    ```bash
    git clone https://github.com/saharalkolombra-bo/bot-dev-tools-helper.git
    cd bot-dev-tools-helper
    ```

2.  Install dependencies and build:

    ```bash
    npm install
    npm run build:editor
    ```

    This bundles CodeMirror for the JSON editor.

3.  Open Chrome and navigate to:

        chrome://extensions

4.  Enable **Developer mode** (top right)

5.  Click **Load unpacked** and select the project folder

6.  Pin the extension to the toolbar (optional but recommended)

------------------------------------------------------------------------

## Configuration

Open the extension → click the ⚙️ **Settings** icon.

Required settings:

-   **CCH Gateway API Base Path**
    -   Examples: `http://localhost:7101`, `https://qa.example.com`
-   **Integration Center API Base Path**
    -   Examples: `http://localhost:3000`, `https://api.example.com`
-   **Entity ID**

These values are used by all relevant tools.

------------------------------------------------------------------------

## Permissions

This extension uses:

-   `storage` -- to persist settings and tool state
-   `tabs` -- to navigate the active tab
-   `<all_urls>` -- required to call internal APIs across environments

Because this is an **internal developer tool**, broad host permissions
are intentional.

------------------------------------------------------------------------

## Project Structure

    /
    ├─ manifest.json
    ├─ popup.html
    ├─ popup.js
    ├─ styles.css
    ├─ json-editor.html         # Separate JSON editor popup
    ├─ json-editor.js
    ├─ xml-viewer.html          # XML display helper
    ├─ xml-viewer.js
    ├─ package.json             # npm dependencies
    ├─ tools/
    │  ├─ generate-cch-return-output.js
    │  └─ generate-bot-return-output.js
    ├─ lib/
    │  ├─ json5.min.js          # JSON5 parser
    │  ├─ codemirror-bundle.js  # CodeMirror source (dev)
    │  └─ codemirror.min.js     # CodeMirror bundle (built)
    └─ icons/
       └─ *.png

Each tool lives in its own component file to keep logic isolated and
easy to extend.

------------------------------------------------------------------------

## Development

### Rebuilding the Editor

If you modify `lib/codemirror-bundle.js`, rebuild with:

```bash
npm run build:editor
```

### Adding New Tools

1.  Create a new tool file under `tools/`
2.  Export a render function
3.  Register the tool in the popup router
4.  Reuse global settings as needed

The architecture is intentionally simple --- no frameworks, minimal
build step (only for CodeMirror bundling).

------------------------------------------------------------------------

## Non-Goals

-   Chrome Web Store publication
-   End-user features
-   Security hardening beyond internal usage
-   Over-engineering

This is a **dev helper**, not a product.

------------------------------------------------------------------------

## License

Internal use only.
