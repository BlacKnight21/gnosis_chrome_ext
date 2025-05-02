// table_page.js (Dropdown for Eligible Filter, Logs Removed)

document.addEventListener('DOMContentLoaded', async () => {
    // --- Get references to HTML elements ---
    const loadButton = document.getElementById('loadButton');
    const controlsAndTableContainer = document.getElementById('controlsAndTableContainer');
    const tableContainer = document.getElementById('tableContainer');
    const statusDiv = document.getElementById('status');
    const globalSearchInput = document.getElementById('globalSearchInput');
    const configColsButton = document.getElementById('configColsButton');
    const colsConfigDiv = document.getElementById('colsConfigDiv');
    const exportCsvButton = document.getElementById('exportCsvButton');

    // --- State Variables ---
    let allTransactions = [];
    let ineligibleMccSet = new Set();
    let columnHeaders = ['Created At', 'Cleared At', 'Amount', 'Currency', 'MCC', 'Merchant Name', 'Eligible (Yes/No)'];
    let columnVisibility = columnHeaders.map(() => true);
    const createdAtColumnIndex = columnHeaders.indexOf('Created At');
    const eligibleColumnIndex = columnHeaders.indexOf('Eligible (Yes/No)');
    const currencyColumnIndex = columnHeaders.indexOf('Currency');

    // --- Function to Load Ineligible MCCs ---
    async function loadIneligibleMccs() {
        try {
            const response = await fetch(chrome.runtime.getURL('ineligible_mccs.json'));
            if (!response.ok) throw new Error(`HTTP error loading MCC list! Status: ${response.status}`);
            const ineligibleMccs = await response.json();
            if (Array.isArray(ineligibleMccs)) ineligibleMccSet = new Set(ineligibleMccs);
            else throw new Error('Ineligible MCCs file is not a valid JSON array.');
        } catch (error) {
            console.error("Error loading ineligible MCCs:", error);
            if (statusDiv) {
                 statusDiv.textContent = `Warning: Could not load ineligible MCC list. Check console. Error: ${error.message}`;
                 statusDiv.className = 'error';
            }
            ineligibleMccSet = new Set();
        }
    }
    await loadIneligibleMccs();


    // --- Filtering Function ---
    function filterTable() {
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

            if (index === createdAtColumnIndex) {
                const startInput = th.querySelector('.date-start'); const endInput = th.querySelector('.date-end');
                const startValue = startInput?.value || ''; const endValue = endInput?.value || '';
                filters[index] = { type: 'date', start: startValue, end: endValue };
                if (startValue || endValue) hasActiveFilter = true;
            } else if (index === eligibleColumnIndex) {
                 const selectInput = th.querySelector('select.eligible-filter');
                 const eligibleValue = selectInput ? selectInput.value : 'all';
                 filters[index] = { type: 'eligible', value: eligibleValue };
                 if (eligibleValue !== 'all') hasActiveFilter = true;
            } else { // Text Filter (includes Currency which will have no input -> value will be '')
                 const textInput = th.querySelector('.column-filter');
                 const textValue = textInput?.value.toLowerCase() || '';
                 filters[index] = { type: 'text', value: textValue };
                 if (textValue) hasActiveFilter = true;
            }
        });

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
                            case 'eligible':
                                if (filter.value !== 'all') {
                                    const isYes = cell.classList.contains('eligible-yes');
                                    const wantsYes = (filter.value === 'yes');
                                    if (wantsYes !== isYes) filterPassed = false;
                                }
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
    } // End filterTable


    // --- Apply Column Visibility ---
    function applyColumnVisibility() {
        const table = tableContainer.querySelector('table');
        if (!table) return;
        columnVisibility.forEach((isVisible, index) => {
            const displayStyle = isVisible ? '' : 'none';
            const cellsToToggle = table.querySelectorAll(`th:nth-child(${index + 1}), td:nth-child(${index + 1})`);
            cellsToToggle.forEach(cell => cell.style.display = displayStyle);
        });
        filterTable(); // Re-apply filters
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
        tableContainer.innerHTML = '';
        // No longer need columnFilterInputs storage globally

        if (!transactions || transactions.length === 0) {
            tableContainer.innerHTML = "<p>No transaction data to display.</p>";
            populateColumnConfig(); // Still populate config
            return;
        }

        const table = document.createElement('table');
        const thead = table.createTHead();
        const tbody = table.createTBody();

        // -- Create Header Row --
        const headerRow = thead.insertRow();
        columnHeaders.forEach((text, index) => {
            const th = document.createElement('th'); th.textContent = text; th.classList.add('resizable-th'); th.dataset.columnIndex = index; headerRow.appendChild(th);
        });

        // -- Create Filter Row --
        const filterRow = thead.insertRow(); filterRow.id = 'filterRow';
        columnHeaders.forEach((header, index) => {
            const th = document.createElement('th'); th.dataset.columnIndex = index;
            if (index === createdAtColumnIndex) {
                 // --- Date Range Input for 'Created At' ---
                 const container = document.createElement('div'); container.classList.add('filter-input-container');
                 const startLabel = document.createElement('label'); startLabel.textContent = 'Start:';
                 const startDateInput = document.createElement('input'); startDateInput.type = 'date'; startDateInput.classList.add('column-filter', 'date-filter', 'date-start'); startDateInput.addEventListener('input', filterTable);
                 const endLabel = document.createElement('label'); endLabel.textContent = 'End:';
                 const endDateInput = document.createElement('input'); endDateInput.type = 'date'; endDateInput.classList.add('column-filter', 'date-filter', 'date-end'); endDateInput.addEventListener('input', filterTable);
                 container.appendChild(startLabel); container.appendChild(startDateInput); container.appendChild(endLabel); container.appendChild(endDateInput);
                 th.appendChild(container);
            } else if (index === eligibleColumnIndex) {
                 // --- Eligible Select Dropdown ---
                 const selectInput = document.createElement('select');
                 selectInput.classList.add('column-filter', 'eligible-filter');
                 selectInput.innerHTML = `
                     <option value="all">All</option>
                     <option value="yes">Yes</option>
                     <option value="no">No</option>
                 `;
                 selectInput.addEventListener('change', filterTable); // Use 'change' for select
                 th.appendChild(selectInput);
            } else if (index === currencyColumnIndex) {
                 // --- Currency Column - No Filter ---
                 th.innerHTML = '&nbsp;';
            } else { // Text filter for others
                 const input = document.createElement('input'); input.type = 'text'; input.placeholder = `Filter ${header}...`; input.classList.add('column-filter'); input.dataset.columnIndex = index; input.addEventListener('input', filterTable);
                 th.appendChild(input);
            }
            filterRow.appendChild(th);
        }); // End forEach header

        // -- Populate Table Body --
        transactions.forEach((tx) => {
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
                } catch (e) { console.error(`Error processing key "${key}":`, e); if (key !== 'eligible') { cell.textContent = 'Error'; } }
                if (key !== 'eligible') { cell.textContent = (value !== undefined && value !== null) ? value : 'N/A'; }
            });
        });

        tableContainer.appendChild(table);

        // --- Setup interactive features ---
        setupColumnResizing(table);
        populateColumnConfig();
        applyColumnVisibility();
    } // End generateTable


    // --- Column Resizing Logic ---
    function setupColumnResizing(table) {
        table.style.tableLayout = 'fixed'; table.style.width = '100%';
        const headerCells = table.querySelectorAll('th.resizable-th');
        let thBeingResized = null; let handleBeingDragged = null; let startX, startWidth;
        headerCells.forEach(th => {
            const oldHandle = th.querySelector('.resize-handle'); if (oldHandle) oldHandle.remove();
            const handle = document.createElement('div'); handle.classList.add('resize-handle');
            th.appendChild(handle); th.style.position = 'relative';
            handle.addEventListener('mousedown', (e) => {
                thBeingResized = th; handleBeingDragged = handle; startX = e.pageX; startWidth = th.offsetWidth;
                document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = 'col-resize'; e.preventDefault();
            });
        });
        function handleMouseMove(e) { if (!thBeingResized) return; const dx = e.pageX - startX; const newWidth = Math.max(40, startWidth + dx); thBeingResized.style.width = `${newWidth}px`; }
        function handleMouseUp() { document.body.style.cursor = ''; document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); thBeingResized = null; handleBeingDragged = null; }
    }


    // --- Export to CSV Function ---
    function escapeCsvCell(cellData) { if (cellData === null || cellData === undefined) return ''; const stringData = String(cellData); if (stringData.includes(',') || stringData.includes('\n') || stringData.includes('"')) { const escapedData = stringData.replace(/"/g, '""'); return `"${escapedData}"`; } return stringData; }
    function exportTableToCsv(filename) {
        const table = tableContainer.querySelector('table'); if (!table) { alert("No table data to export."); return; }
        let csv = []; const headers = Array.from(table.querySelectorAll('thead tr:first-child th')).filter((th, index) => columnVisibility[index]).map(th => escapeCsvCell(th.textContent)); csv.push(headers.join(','));
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.style.display !== 'none') { const rowData = Array.from(row.querySelectorAll('td')).filter((td, index) => columnVisibility[index]).map(td => escapeCsvCell(td.textContent)); csv.push(rowData.join(',')); }
        });
        const csvString = csv.join('\n'); const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) { const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", filename || 'transactions.csv'); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); setTimeout(() => URL.revokeObjectURL(url), 100); }
        else { alert("CSV export is not supported."); }
    }

    // --- Event Listeners ---
    configColsButton.addEventListener('click', () => { const isHidden = colsConfigDiv.style.display === 'none'; colsConfigDiv.style.display = isHidden ? 'block' : 'none'; });
    exportCsvButton.addEventListener('click', () => { exportTableToCsv('gnosis_transactions.csv'); });
    globalSearchInput.addEventListener('input', filterTable);

    // --- Load Button Click Handler ---
    loadButton.addEventListener('click', () => {
        tableContainer.innerHTML = '';
        controlsAndTableContainer.style.display = 'block';
        if (statusDiv) { statusDiv.textContent = 'Requesting data...'; statusDiv.className = 'loading'; }
        allTransactions = [];
        chrome.runtime.sendMessage({ action: "fetchTransactions" }, (response) => {
            const currentStatusDiv = document.getElementById('status'); // Re-get
            if (chrome.runtime.lastError) { if(currentStatusDiv){ currentStatusDiv.textContent = `Comm Error: ${chrome.runtime.lastError.message}`; currentStatusDiv.className = 'error'; } generateTable([]); return; }
            if (response && response.success) {
                const data = response.data; allTransactions = Array.isArray(data) ? data : (data.data || []);
                if (!allTransactions || allTransactions.length === 0) { if(currentStatusDiv) { currentStatusDiv.textContent = 'No transactions found.'; currentStatusDiv.className = 'error'; } generateTable([]); return; }
                if(ineligibleMccSet.size === 0 && currentStatusDiv && !currentStatusDiv.textContent.includes("Warning")) { currentStatusDiv.textContent = `Loaded ${allTransactions.length} txns. (Warn: MCC list empty/failed?)`; currentStatusDiv.className = 'error'; }
                else if (currentStatusDiv && !currentStatusDiv.textContent.includes("Warning")){ currentStatusDiv.textContent = `Successfully loaded ${allTransactions.length} transactions.`; currentStatusDiv.className = 'success'; }
                generateTable(allTransactions);
            } else { if(currentStatusDiv) { currentStatusDiv.textContent = `Workspace Error: ${response ? response.error : 'Unknown error'}.`; currentStatusDiv.className = 'error'; } console.error('Background script reported error:', response ? response.error : 'Unknown'); allTransactions = []; generateTable([]); }
        });
    }); // End button click listener

}); // End DOMContentLoaded listener