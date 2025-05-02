# Gnosis Pay Transaction Viewer - Chrome Extension

This Chrome extension allows you to view your transaction history from the Gnosis Pay web app (`app.gnosispay.com`) in a sortable, filterable table within a dedicated browser tab.

## Features

* Fetches transaction data directly from the Gnosis Pay API (requires you to be logged in).
* Displays data in a clear table format.
* Columns include: Created At, Cleared At, Amount, Currency, MCC, Merchant Name, Eligible (Yes/No).
* **Filtering:**
    * Global search across all columns.
    * Date range filters (Start/End) for "Created At" and "Cleared At".
    * Min/Max number filters for "Amount".
    * Dropdown filter ("All"/"Yes"/"No") for "Eligible".
    * Text filters for other columns (MCC, Merchant Name, Cleared At).
* **Column Configuration:** Show/hide individual columns.
* **Column Resizing:** Drag column header edges to resize.
* **CSV Export:** Export the currently visible (filtered) table data to a CSV file.
* **Eligibility Check:** Marks transactions as "Eligible" (✅) or "Not Eligible" (❌) based on a predefined list of Merchant Category Codes (MCCs) in `ineligible_mccs.json`.

## Installation Instructions (Loading Unpacked Extension)

Since this extension is not on the Chrome Web Store, you need to load it manually using Chrome's Developer Mode.

**Prerequisites:**

* You need Google Chrome installed.
* You need the extension files downloaded and saved in a specific folder structure.

**Folder Structure:**

Ensure you have the following files organized in a folder named `gnosis-page-extension`:


src/
├── manifest.json
├── background.js
├── table_page.html
├── table_page.js
├── style.css
├── ineligible_mccs.json
└── images/
├── icon16.png
├── icon48.png
└── icon128.png


*(Make sure the `images` folder exists and contains the three icon files.)*

**Steps:**

1.  **Open Chrome Extensions Page:**
    * Open Google Chrome.
    * Type `chrome://extensions` in the address bar and press Enter.

2.  **Enable Developer Mode:**
    * Look for the "Developer mode" toggle switch, usually located in the top-right corner of the Extensions page.
    * Click the toggle to turn **ON** Developer Mode. You should see some new buttons appear, including "Load unpacked".

    ![Developer Mode Toggle](https://developer.chrome.com/static/docs/extensions/get-started/images/tut_step_1.png) *(Image source: Google Chrome Developers)*

3.  **Load the Extension:**
    * Click the **"Load unpacked"** button.
    * A file browser window will open.
    * Navigate to and select the **entire `gnosis-page-extension` folder** (the folder containing `manifest.json`, not the files inside it).
    * Click "Select Folder" or "Open".

4.  **Verify Installation:**
    * The "Gnosis Pay Transaction Page" extension should now appear in your list of installed extensions on the `chrome://extensions` page.
    * Make sure there are no red "Errors" buttons shown on its card. If there are, click the button to see the details (often related to the `manifest.json` file).

5.  **(Optional but Recommended) Pin to Toolbar:**
    * Click the puzzle piece icon (🧩) in your Chrome toolbar (usually top-right).
    * Find "Gnosis Pay Transaction Page" in the dropdown list.
    * Click the Pin icon (📌) next to it. This will make the extension's icon always visible on your toolbar for easy access.

## How to Use

1.  **Log In:** Make sure you are logged into your Gnosis Pay account at `https://app.gnosispay.com/` in your browser.
2.  **Click Icon:** Click the extension's icon (either from the puzzle menu or your pinned toolbar icon).
3.  **New Tab Opens:** A new browser tab will open displaying the extension's page ("Gnosis Pay Transactions").
4.  **Load Data:** Click the "Load Transactions" button within that new tab.
5.  **View & Interact:** The table should populate with your transaction data. You can now use the filters, configure columns, resize columns, and export the data.

