console.log("Etsy Order Data Extractor content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  if (request.action === "getOrderData") {
    const orderData = extractOrderData();
    if (orderData) {
      console.log("Order data extracted, sending to background script");
      chrome.runtime.sendMessage({
        action: "extractOrderData",
        orderData: orderData,
      });
    } else {
      console.log("Order data not found");
      alert(
        "Could not find the order details. Make sure you're on an Etsy order page."
      );
    }
  } else if (request.action === "showAlert") {
    alert(request.message);
  }
  sendResponse({ received: true });
});

function extractOrderData() {
  return (
    document.getElementsByClassName("address")[0].outerHTML +
    document.getElementById("order-detail-container").outerHTML
  );
}

console.log("Content script fully loaded");
