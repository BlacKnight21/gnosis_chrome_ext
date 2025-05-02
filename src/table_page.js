// table_page.js (Complete and Corrected with Debug Logs around loadIneligibleMccs)

console.log("--- table_page.js parsing starting now ---");

document.addEventListener('DOMContentLoaded', async () => {
    console.log("--- DOMContentLoaded listener entered ---");

    // --- Get references & Check ---
    const loadButton = document.getElementById('loadButton');
    const controlsAndTableContainer = document.getElementById('controlsAndTableContainer');
    const tableContainer = document.getElementById('tableContainer');
    const statusDiv = document.getElementById('status');
    const globalSearchInput = document.getElementById('globalSearchInput');
    const configColsButton = document.getElementById('configColsButton');
    const colsConfigDiv = document.getElementById('colsConfigDiv');
    const exportCsvButton = document.getElementById('exportCsvButton');

    if (!loadButton || !controlsAndTableContainer || !tableContainer || !statusDiv || !globalSearchInput || !configColsButton || !colsConfigDiv || !exportCsvButton) {
        console.error("--- CRITICAL: One or more essential HTML elements not found by ID! Check HTML IDs. Stopping setup. ---");
        // Display error if possible
        try {
             if(statusDiv) {
                statusDiv.textContent = "Error: Page elements missing (check console). Cannot initialize.";
                statusDiv.className = "error";
                if(controlsAndTableContainer) controlsAndTableContainer.style.display = 'block';
             } else {
                 alert("Critical Error: Could not find essential page elements.");
             }
        } catch(e) {
             alert("Critical Error: Could not find essential page elements and failed to display status.");
        }
        return;
    }
    console.log("--- All essential elements found by ID. ---");


    // --- State Variables & Index Definitions ---
    let allTransactions = [];
    let ineligibleMccSet = new Set();
    let columnHeaders = ['Created At', 'Cleared At', 'Amount', 'Currency', 'MCC', 'Merchant Name', 'Eligible (Yes/No)'];
    let columnVisibility = columnHeaders.map(() => true);
    const createdAtColumnIndex = columnHeaders.indexOf('Created At');
    const clearedAtColumnIndex = columnHeaders.indexOf('Cleared At');
    const amountColumnIndex = columnHeaders.indexOf('Amount');
    const currencyColumnIndex = columnHeaders.indexOf('Currency');
    const eligibleColumnIndex = columnHeaders.indexOf('Eligible (Yes/No)');
    const dateColumnIndices = [createdAtColumnIndex, clearedAtColumnIndex];
    const textColumnIndices = columnHeaders.map((_, index) => index)
        .filter(index => !dateColumnIndices.includes(index) && index !== eligibleColumnIndex && index !== currencyColumnIndex && index !== amountColumnIndex );
    console.log("--- Column indices calculated ---");


    // --- Function to Load Ineligible MCCs (with internal logs) ---
    async function loadIneligibleMccs() {
        console.log("--- loadIneligibleMccs() function entered ---"); // ADDED
        let mccUrl = '';
        try {
            mccUrl = chrome.runtime.getURL('ineligible_mccs.json');
            console.log("--- URL for MCCs:", mccUrl); // ADDED
            if (!mccUrl) { throw new Error("chrome.runtime.getURL returned empty URL for MCC list."); }

            const response = await fetch(mccUrl);
            console.log("--- Fetch response received. Status:", response.status); // ADDED
            if (!response.ok) throw new Error(`HTTP error loading MCC list! Status: ${response.status}`);

            const ineligibleMccs = await response.json();
            console.log("--- MCC list JSON parsed. Type:", typeof ineligibleMccs); // ADDED
            if (Array.isArray(ineligibleMccs)) {
                ineligibleMccSet = new Set(ineligibleMccs);
                console.log(`--- Loaded ${ineligibleMccSet.size} ineligible MCCs successfully. ---`);
            } else {
                throw new Error('Ineligible MCCs file content is not a valid JSON array.');
            }
        } catch (error) {
            console.error("--- ERROR inside loadIneligibleMccs:", error); // ADDED Context
            if (statusDiv) {
                 statusDiv.textContent = `Warning: Could not load MCC list. Check console. Error: ${error.message}`;
                 statusDiv.className = 'error';
            }
            ineligibleMccSet = new Set(); // Ensure empty set on error
        }
        console.log("--- loadIneligibleMccs() function finished. ---"); // ADDED
    }

     // --- Call loadIneligibleMccs with Logging and Error Catching ---
     console.log("--- About to call await loadIneligibleMccs() ---"); // ADDED
     try {
         await loadIneligibleMccs();
         console.log("--- Finished awaiting loadIneligibleMccs(). ---"); // ADDED
     } catch (error) {
         console.error("--- ERROR during the 'await loadIneligibleMccs()' call itself: ---", error); // ADDED
          if (statusDiv) {
              statusDiv.textContent = `CRITICAL ERROR Initializing MCC list. Check console. Error: ${error.message}`;
              statusDiv.className = 'error';
         }
          // Optionally stop execution
          // return;
     }


    // --- Filtering Function ---
    function filterTable() {
        // console.log("FILTER: filterTable() called."); // Optional log
        const globalSearchTerm = globalSearchInput.value.toLowerCase();
        const tableBody = tableContainer.querySelector('tbody');
        const filterRow = tableContainer.querySelector('#filterRow');
        if (!tableBody || !filterRow) return;

        // Get Filter Values
        const filters = {};
        let hasActiveFilter = false;
        columnHeaders.forEach((_, index) => {
            if (!columnVisibility[index]) return;
            const th = filterRow.querySelector(`th:nth-child(${index + 1})`);
            if (!th) return;

            if (dateColumnIndices.includes(index)) {
                const startInput = th.querySelector('.date-start'); const endInput = th.querySelector('.date-end');
                const startValue = startInput?.value || ''; const endValue = endInput?.value || '';
                filters[index] = { type: 'date', start: startValue, end: endValue };
                if (startValue || endValue) hasActiveFilter = true;
            } else if (index === eligibleColumnIndex) {
                 const selectInput = th.querySelector('select.eligible-filter');
                 const eligibleValue = selectInput ? selectInput.value : 'all';
                 filters[index] = { type: 'eligible', value: eligibleValue };
                 if (eligibleValue !== 'all') hasActiveFilter = true;
            } else if (index === amountColumnIndex) {
                 const minInput = th.querySelector('.amount-min'); const maxInput = th.querySelector('.amount-max');
                 const minVal = minInput ? parseFloat(minInput.value) : NaN;
                 const maxVal = maxInput ? parseFloat(maxInput.value) : NaN;
                 filters[index] = { type: 'amount', min: !isNaN(minVal) ? minVal : null, max: !isNaN(maxVal) ? maxVal : null };
                 if (filters[index].min !== null || filters[index].max !== null) hasActiveFilter = true;
            } else { // Text Filter
                 const textInput = th.querySelector('.column-filter');
                 const textValue = textInput?.value.toLowerCase() || '';
                 filters[index] = { type: 'text', value: textValue };
                 if (textValue) hasActiveFilter = true;
            }
        });
        // console.log("FILTER: Collected Filters:", JSON.stringify(filters)); // Optional log

        // Filter Rows
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let rowVisible = true;

            // Global Search
            if (globalSearchTerm) {
                 let rowText = Array.from(cells).map(cell => cell.textContent).join(' ').toLowerCase();
                 if (!rowText.includes(globalSearchTerm)) rowVisible = false;
            }

            // Column Filters
            if (rowVisible && hasActiveFilter) {
                for (let i = 0; i < columnHeaders.length; i++) {
                    if (!columnVisibility[i] || !filters[i] || !cells[i]) continue;
                    const cell = cells[i]; const filter = filters[i];
                    let filterPassed = true;
                    try {
                        switch (filter.type) {
                            case 'date':
                                const cellIsoDateStr = cell.dataset.isoDate;
                                if (!cellIsoDateStr && (filter.start || filter.end)) { filterPassed = false; break; }
                                if (!cellIsoDateStr) continue;
                                const cellDate = new Date(cellIsoDateStr); if (isNaN(cellDate)) { filterPassed = false; break; }
                                if (filter.start) { const startDate = new Date(filter.start + "T00:00:00.000Z"); if (isNaN(startDate) || cellDate < startDate) filterPassed = false; }
                                if (filterPassed && filter.end) { const endDate = new Date(filter.end + "T23:59:59.999Z"); if (isNaN(endDate) || cellDate > endDate) filterPassed = false; }
                                break;
                            case 'amount':
                                const cellAmount = parseFloat(cell.textContent.replace(/,/g, ''));
                                if (isNaN(cellAmount) && (filter.min !== null || filter.max !== null)) { filterPassed = false; }
                                else if (!isNaN(cellAmount)) {
                                     if (filter.min !== null && cellAmount < filter.min) filterPassed = false;
                                     if (filterPassed && filter.max !== null && cellAmount > filter.max) filterPassed = false;
                                }
                                break;
                            case 'eligible':
                                if (filter.value !== 'all') { const isYes = cell.classList.contains('eligible-yes'); const wantsYes = (filter.value === 'yes'); if (wantsYes !== isYes) filterPassed = false; }
                                break;
                            case 'text':
                                if (filter.value) { const cellText = cell.textContent.toLowerCase(); if (!cellText.includes(filter.value)) filterPassed = false; }
                                break;
                        }
                    } catch (e) { console.warn("Filter comparison error:", e); filterPassed = false; }
                    if (!filterPassed) { rowVisible = false; break; }
                }
            }
            row.style.display = rowVisible ? '' : 'none';
        });
        // console.log("FILTER: filterTable() finished."); // Optional log
    } // End filterTable


    // --- Apply Column Visibility ---
    function applyColumnVisibility() {
        // console.log(" ApplyVisibility - State:", columnVisibility); // Optional log
        const table = tableContainer.querySelector('table');
        if (!table) return;
        columnVisibility.forEach((isVisible, index) => {
            const displayStyle = isVisible ? '' : 'none';
            // console.log(` ApplyVisibility - Column ${index}: ${isVisible ? 'Show' : 'Hide'}`); // Optional log
            const cellsToToggle = table.querySelectorAll(`th:nth-child(${index + 1}), td:nth-child(${index + 1})`);
            cellsToToggle.forEach(cell => cell.style.display = displayStyle);
        });
        // console.log(" ApplyVisibility - Finished applying styles. Re-filtering..."); // Optional log
        filterTable();
    }

    // --- Populate Column Configuration Checkboxes ---
    function populateColumnConfig() {
        colsConfigDiv.innerHTML = '<h4>Show/Hide Columns:</h4>';
        columnHeaders.forEach((header, index) => {
            const checkboxId = `col-toggle-idx-${index}`;
            const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = checkboxId; checkbox.checked = columnVisibility[index]; checkbox.dataset.columnIndex = index; checkbox.classList.add('col-toggle-cb');
            checkbox.addEventListener('change', (event) => { const idx = parseInt(event.target.dataset.columnIndex); columnVisibility[idx] = event.target.checked; applyColumnVisibility(); });
            const label = document.createElement('label'); label.htmlFor = checkboxId; label.textContent = header;
            colsConfigDiv.appendChild(checkbox); colsConfigDiv.appendChild(label); colsConfigDiv.appendChild(document.createElement('br'));
        });
    }


    // --- Table Generation Function ---
    function generateTable(transactions) {
        console.log("generateTable: Starting."); // Minimal log
        tableContainer.innerHTML = '';
        if (!Array.isArray(transactions) || transactions.length === 0) {
             console.log("generateTable: No valid transactions array provided.");
             tableContainer.innerHTML = "<p>No transaction data to display.</p>"; populateColumnConfig(); return;
        }
        console.log(`generateTable: Generating table for ${transactions.length} transactions.`);

        const table = document.createElement('table'); const thead = table.createTHead(); const tbody = table.createTBody();

        // -- Create Header Row --
        const headerRow = thead.insertRow();
        columnHeaders.forEach((text, index) => {
            const th = document.createElement('th'); th.textContent = text; th.classList.add('resizable-th'); th.dataset.columnIndex = index; headerRow.appendChild(th);
        });

        // -- Create Filter Row --
        const filterRow = thead.insertRow(); filterRow.id = 'filterRow';
        columnHeaders.forEach((header, index) => {
            const th = document.createElement('th'); th.dataset.columnIndex = index;
            if (dateColumnIndices.includes(index)) {
                 const container = document.createElement('div'); container.classList.add('filter-input-container');
                 const startLabel = document.createElement('label'); startLabel.textContent = 'Start:';
                 const startDateInput = document.createElement('input'); startDateInput.type = 'date'; startDateInput.classList.add('column-filter', 'date-filter', 'date-start'); startDateInput.addEventListener('input', filterTable);
                 const endLabel = document.createElement('label'); endLabel.textContent = 'End:';
                 const endDateInput = document.createElement('input'); endDateInput.type = 'date'; endDateInput.classList.add('column-filter', 'date-filter', 'date-end'); endDateInput.addEventListener('input', filterTable);
                 container.appendChild(startLabel); container.appendChild(startDateInput); container.appendChild(endLabel); container.appendChild(endDateInput);
                 th.appendChild(container);
            } else if (index === amountColumnIndex) {
                 const container = document.createElement('div'); container.classList.add('filter-input-container');
                 const minLabel = document.createElement('label'); minLabel.textContent = 'Min:';
                 const minInput = document.createElement('input'); minInput.type = 'number'; minInput.step = '0.01'; minInput.placeholder="Min"; minInput.classList.add('column-filter', 'amount-filter', 'amount-min'); minInput.addEventListener('input', filterTable);
                 const maxLabel = document.createElement('label'); maxLabel.textContent = 'Max:';
                 const maxInput = document.createElement('input'); maxInput.type = 'number'; maxInput.step = '0.01'; maxInput.placeholder="Max"; maxInput.classList.add('column-filter', 'amount-filter', 'amount-max'); maxInput.addEventListener('input', filterTable);
                 container.appendChild(minLabel); container.appendChild(minInput); container.appendChild(maxLabel); container.appendChild(maxInput);
                 th.appendChild(container);
            } else if (index === eligibleColumnIndex) {
                 const selectInput = document.createElement('select'); selectInput.classList.add('column-filter', 'eligible-filter');
                 selectInput.innerHTML = `<option value="all">All</option><option value="yes">Yes</option><option value="no">No</option>`;
                 selectInput.addEventListener('change', filterTable);
                 th.appendChild(selectInput);
            } else if (index === currencyColumnIndex) {
                 th.innerHTML = '&nbsp;'; // No filter
            } else { // Text filter for others
                 const input = document.createElement('input'); input.type = 'text'; input.placeholder = `Filter ${header}...`; input.classList.add('column-filter'); input.dataset.columnIndex = index; input.addEventListener('input', filterTable);
                 th.appendChild(input);
            }
            filterRow.appendChild(th);
        });

        // -- Populate Table Body --
        transactions.forEach((tx, txIndex) => {
            // Add basic check for valid transaction object
            if (!tx) {
                console.warn(`generateTable: Skipping null/undefined transaction object at index ${txIndex}`);
                return; // continue to next iteration
            }
            const row = tbody.insertRow();
            const columnKeys = ['createdAt', 'clearedAt', 'transactionAmount', 'symbol', 'mcc', 'name', 'eligible'];
            columnKeys.forEach((key) => {
                const cell = row.insertCell(); let value = 'N/A'; let isEligible = false;
                try {
                    switch (key) {
                        case 'createdAt': case 'clearedAt': value = tx[key]; if (value) { cell.dataset.isoDate = value; value = new Date(value).toLocaleString(); } break;
                        case 'transactionAmount': const amountStr = tx.transactionAmount; const decimals = tx.transactionCurrency?.decimals ?? 2; const amountNum = parseFloat(amountStr); if (amountStr && !isNaN(amountNum) && typeof decimals === 'number') { value = (amountNum / Math.pow(10, decimals)).toFixed(decimals); } else { value = amountStr || 'N/A'; } break;
                        case 'symbol': value = tx.transactionCurrency?.symbol; break;
                        case 'mcc': value = tx.mcc; break;
                        case 'name': value = tx.merchant?.name?.trim(); break;
                        case 'eligible': const currentMcc = tx.mcc; if (currentMcc && ineligibleMccSet.has(currentMcc.toString())) { isEligible = false; } else { isEligible = true; } if (isEligible) { cell.innerHTML = `<span class="eligible-symbol eligible-yes">&check;</span> Yes`; cell.classList.add('eligible-yes'); } else { cell.innerHTML = `<span class="eligible-symbol eligible-no">&#x2718;</span> No`; cell.classList.add('eligible-no'); } break;
                    }
                } catch (e) { console.error(`Error processing key "${key}" for tx index ${txIndex}:`, e); if (key !== 'eligible') { cell.textContent = 'Error'; cell.style.backgroundColor = 'pink';} }
                if (key !== 'eligible') { cell.textContent = (value !== undefined && value !== null) ? value : 'N/A'; }
            });
        });

        tableContainer.appendChild(table);

        // --- Setup interactive features ---
        setupColumnResizing(table);
        populateColumnConfig();
        applyColumnVisibility(); // This calls filterTable
        console.log("generateTable: Finished."); // Minimal log
    } // End generateTable


    // --- Column Resizing Logic ---
    function setupColumnResizing(table) { console.log(" Resizing setup running..."); // Log for setup
        // Ensure table layout is fixed (important!)
        table.style.tableLayout = 'fixed';
        table.style.width = '100%'; // Ensure table fills container

        const headerCells = table.querySelectorAll('th.resizable-th');
        let thBeingResized = null; // Track the header cell being resized
        let handleBeingDragged = null; // Track the specific handle div being dragged
        let startX, startWidth; // Store starting mouse position and width

        headerCells.forEach(th => {
            // Remove any old handle if table is regenerated
            const oldHandle = th.querySelector('.resize-handle');
            if (oldHandle) oldHandle.remove();

            // Create a dedicated invisible handle div on the right edge
            const handle = document.createElement('div');
            handle.classList.add('resize-handle'); // Use class for styling

            // Ensure parent TH has relative positioning for absolute handle
            th.style.position = 'relative';
            th.appendChild(handle); // Add handle inside the header cell

            // Attach mousedown listener to the handle
            handle.addEventListener('mousedown', (e) => {
                console.log(" Handle mousedown on:", th.textContent.trim()); // Log mousedown start
                thBeingResized = th; // The parent TH is the target for resizing
                handleBeingDragged = handle; // Keep track of the handle
                startX = e.pageX; // Record initial mouse X position
                startWidth = th.offsetWidth; // Record initial rendered width of the TH
                console.log(`  -> startX: ${startX}, startWidth: ${startWidth}`); // Log values

                // Add listeners to the whole document to track mouse movement anywhere
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);

                // Change cursor globally during resize for better UX
                document.body.style.cursor = 'col-resize';
                // Prevent default text selection behavior during drag
                e.preventDefault();
            });
        });

        // Function to handle mouse movement during resize
        function handleMouseMove(e) {
            // Only run if we are actively resizing a column
            if (!thBeingResized) return;

            const dx = e.pageX - startX; // Calculate change in X position
            // Calculate new width, ensuring a minimum width (e.g., 40px)
            const newWidth = Math.max(40, startWidth + dx);
            // Apply the new width directly to the header cell's style
            thBeingResized.style.width = `${newWidth}px`;
        }

        // Function to handle mouse button release (end resizing)
        function handleMouseUp() {
             // Only run if we were actually resizing
            if (!thBeingResized) return;
            console.log(" Mouseup - resize finished for:", thBeingResized.textContent.trim()); // Log end

            // Reset global cursor
            document.body.style.cursor = '';
            // IMPORTANT: Remove the document-level listeners to stop tracking mouse movements
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            // Clear the state variables
            thBeingResized = null;
            handleBeingDragged = null;
            startX = null;
            startWidth = null;
        }
        console.log(" Resizing setup finished."); 
     } // end column resizing funcion

    // --- Export to CSV Function ---
    function escapeCsvCell(cellData) {// Handle null or undefined input
        if (cellData === null || cellData === undefined) {
            return '';
        }

        // Convert to string and trim leading/trailing whitespace
        const stringData = String(cellData).trim();

        // Check if the string contains characters that require escaping in CSV
        // (comma, newline, or double quote)
        if (stringData.includes(',') || stringData.includes('\n') || stringData.includes('"')) {
            // If escaping is needed:
            // 1. Replace any existing double quotes within the string with two double quotes ("").
            const escapedData = stringData.replace(/"/g, '""');
            // 2. Wrap the entire modified string in double quotes.
            return `"${escapedData}"`;
        }

        // If no special characters are found, return the string as is.
        return stringData; 
    }
    function exportTableToCsv(filename) { console.log("EXPORT: exportTableToCsv called with filename:", filename); // Log entry
        const table = tableContainer.querySelector('table');
        if (!table) {
            console.error("EXPORT: No table found in tableContainer."); // Log error
            alert("Error: Could not find table data to export.");
            return;
        }
        console.log("EXPORT: Table element found.");

        let csv = [];
        console.log("EXPORT: Current columnVisibility state:", columnVisibility); // Log visibility state

        // Process Headers
        try {
            const headers = Array.from(table.querySelectorAll('thead tr:first-child th'))
                                .filter((th, index) => {
                                    const isVisible = columnVisibility[index];
                                    // console.log(` EXPORT: Header Index ${index}, Visible: ${isVisible}, Content: ${th.textContent}`); // Verbose log
                                    return isVisible;
                                 }) // Only include visible headers
                                .map(th => escapeCsvCell(th.textContent)); // Uses escapeCsvCell which now includes trim()
            const headerString = headers.join(',');
            csv.push(headerString);
            console.log("EXPORT: Processed Headers:", headerString); // Log processed headers
        } catch(e) {
            console.error("EXPORT: Error processing table headers:", e);
            alert("Error processing table headers for export.");
            return;
        }


        // Process Body Rows
        let visibleRowsProcessed = 0;
        try {
            const rows = table.querySelectorAll('tbody tr');
            console.log(`EXPORT: Found ${rows.length} total rows in tbody.`);
            rows.forEach((row, rowIndex) => {
                // Only include rows that are currently visible (respects filtering)
                if (row.style.display !== 'none') {
                    visibleRowsProcessed++;
                    const rowData = Array.from(row.querySelectorAll('td'))
                                        .filter((td, index) => columnVisibility[index]) // Only include cells from visible columns
                                        .map(td => escapeCsvCell(td.textContent)); // Uses escapeCsvCell which now includes trim()
                    csv.push(rowData.join(','));
                    // Log only first few rows to avoid flooding console
                    if (visibleRowsProcessed <= 5) {
                        console.log(`EXPORT: Processed visible row ${visibleRowsProcessed} data:`, rowData.join(','));
                    } else if (visibleRowsProcessed === 6) {
                         console.log("EXPORT: ... (further rows omitted from log)");
                    }
                } else {
                    // console.log(`EXPORT: Skipping hidden row index ${rowIndex}`); // Optional verbose log
                }
            });
             console.log(`EXPORT: Finished processing rows. ${visibleRowsProcessed} visible rows added.`);
        } catch(e) {
            console.error("EXPORT: Error processing table body rows:", e);
            alert("Error processing table body rows for export.");
            return;
        }


        if (csv.length <= 1) { // Only headers or empty
             console.warn("EXPORT: No visible data rows to export.");
             alert("No visible data rows to export.");
             return;
        }

        // Create Blob and Download Link
        try {
            console.log("EXPORT: Creating CSV string and Blob...");
            const csvString = csv.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            console.log("EXPORT: Blob created. Size:", blob.size);

            console.log("EXPORT: Creating download link...");
            const link = document.createElement("a");
            if (link.download !== undefined) { // Feature detection
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename || 'transactions.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                console.log("EXPORT: Triggering link click...");
                link.click();
                console.log("EXPORT: Link click triggered.");
                document.body.removeChild(link);
                 // Delay revoking URL slightly for firefox compatibility
                 setTimeout(() => {
                    URL.revokeObjectURL(url);
                    console.log("EXPORT: Object URL revoked.");
                 }, 100);
            } else {
                 console.error("EXPORT: Link download attribute not supported.");
                 alert("CSV export is not supported in this browser.");
            }
        } catch (e) {
             console.error("EXPORT: Error creating blob or download link:", e);
             alert("Error occurred during CSV file creation or download.");
        }
        console.log("EXPORT: exportTableToCsv finished."); // Log exit

    }

    // --- Event Listeners ---
    console.log("--- Attaching listeners... ---");
    configColsButton.addEventListener('click', () => { const isHidden = colsConfigDiv.style.display === 'none'; colsConfigDiv.style.display = isHidden ? 'block' : 'none'; });
    exportCsvButton.addEventListener('click', () => { exportTableToCsv('gnosis_transactions.csv'); });
    globalSearchInput.addEventListener('input', filterTable);
    loadButton.addEventListener('click', () => {
        console.log("--- Load button click listener fired! ---");
        tableContainer.innerHTML = '';
        controlsAndTableContainer.style.display = 'block';
        if (statusDiv) { statusDiv.textContent = 'Requesting data...'; statusDiv.className = 'loading'; }
        allTransactions = [];
        chrome.runtime.sendMessage({ action: "fetchTransactions" }, (response) => {
            console.log("--- Received response callback. runtime.lastError:", chrome.runtime.lastError);
            const currentStatusDiv = document.getElementById('status');
            if (chrome.runtime.lastError) { if(currentStatusDiv){ currentStatusDiv.textContent = `Comm Error: ${chrome.runtime.lastError.message}`; currentStatusDiv.className = 'error'; } generateTable([]); return; }
            if (response && response.success) {
                console.log("--- Background response successful. Raw data received length:", Array.isArray(response.data) ? response.data.length: typeof response.data); // Log length or type
                const data = response.data;
                allTransactions = Array.isArray(data) ? data : (data.data || []); // Handle common nesting pattern
                if (!Array.isArray(allTransactions)) {
                     console.error("--- ERROR: Processed data ('allTransactions') is still not an array!", allTransactions);
                     if(currentStatusDiv) { currentStatusDiv.textContent = 'Error: Invalid data structure received.'; currentStatusDiv.className = 'error'; }
                     allTransactions = [];
                }
                if (!allTransactions || allTransactions.length === 0) { if(currentStatusDiv) { currentStatusDiv.textContent = 'No transactions found.'; currentStatusDiv.className = 'error'; } generateTable([]); return; }
                if(ineligibleMccSet.size === 0 && currentStatusDiv && !currentStatusDiv.textContent.includes("Warning")) { currentStatusDiv.textContent = `Loaded ${allTransactions.length} txns. (Warn: MCC list empty/failed?)`; currentStatusDiv.className = 'error'; }
                else if (currentStatusDiv && !currentStatusDiv.textContent.includes("Warning")){ currentStatusDiv.textContent = `Successfully loaded ${allTransactions.length} transactions.`; currentStatusDiv.className = 'success'; }
                generateTable(allTransactions);
            } else {
                 if(currentStatusDiv) { currentStatusDiv.textContent = `Workspace Error: ${response ? response.error : 'Unknown error'}.`; currentStatusDiv.className = 'error'; }
                 console.error('Background script reported error:', response ? response.error : 'Unknown');
                 allTransactions = [];
                 generateTable([]);
            }
        });
    }); // End button click listener
    console.log("--- All initial setup in DOMContentLoaded complete. ---");

}); // End DOMContentLoaded listener