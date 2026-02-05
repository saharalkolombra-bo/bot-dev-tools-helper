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

### Generate Return Output

Quickly build and navigate to CCH Gateway return output endpoints.

-   Supports:
    -   **CCH XML**
    -   **BlackOre JSON**
-   Input-driven Return ID builder:
    -   Return Year
    -   Return Type (Individual / Partnership)
    -   Client ID (typeahead search)
    -   Version (1--100)
-   Automatically navigates the current tab to the generated endpoint

### Client ID Typeahead

-   Fetches a default client list on focus
-   Debounced search (700ms) when typing
-   Displays client ID + client name
-   Handles large client lists efficiently

### Global Settings

-   Configurable **CCH Gateway API Base Path**
-   Global **Entity ID**
-   Settings persist via `chrome.storage.local`

------------------------------------------------------------------------

## Why this exists

This tool exists to remove friction from repetitive dev tasks: - No more
manually crafting return URLs - No more copy/paste between tools -
Faster iteration when testing APIs (local, QA, etc.)

It's intentionally simple, opinionated, and optimized for daily
developer use.

------------------------------------------------------------------------

## Installation (Local)

1.  Clone the repository:

    ``` bash
    git clone https://github.com/<your-org>/bot-dev-tools-helper.git
    ```

2.  Open Chrome and navigate to:

        chrome://extensions

3.  Enable **Developer mode** (top right)

4.  Click **Load unpacked** and select the project folder

5.  Pin the extension to the toolbar (optional but recommended)

------------------------------------------------------------------------

## Configuration

Open the extension → click the ⚙️ **Settings** icon.

Required settings: - **CCH Gateway API Base Path** - Examples: -
`http://localhost:7101` - `https://qa.example.com` - **Entity ID**

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
    ├─ tools/
    │  └─ generate-return-output.js
    ├─ icons/
    │  └─ *.png

Each tool lives in its own component file to keep logic isolated and
easy to extend.

------------------------------------------------------------------------

## Adding New Tools

1.  Create a new tool file under `tools/`
2.  Export a render function
3.  Register the tool in the popup router
4.  Reuse global settings as needed

The architecture is intentionally simple --- no frameworks, no build
step.

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
