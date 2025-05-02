// background.js

// Listen for the extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open the table page in a new tab when the icon is clicked
  chrome.tabs.create({
    url: chrome.runtime.getURL("table_page.html") // Use the extension's internal URL
  });
});

// Listen for messages from the table_page.js script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if the message is asking to fetch transactions
  if (request.action === "fetchTransactions") {
    const apiUrl = 'https://app.gnosispay.com/api/v1/transactions';

    // Perform the fetch request from the background script
    fetch(apiUrl)
      .then(response => {
        // Check if the HTTP response status is OK (e.g., 200)
        if (!response.ok) {
          // If not OK, try to read the response body as text for more detailed error info
          return response.text().then(text => {
             throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}. Body: ${text}`);
          });
        }
        // If response is OK, parse it as JSON
        return response.json();
      })
      .then(data => {
        // If fetch and JSON parsing were successful, send the data back
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        // If any error occurred during fetch or processing, send an error message back
        console.error('Background fetch error:', error); // Keep essential error logging
        sendResponse({ success: false, error: error.message });
      });

    // Return true for asynchronous response
    return true;
  }
});