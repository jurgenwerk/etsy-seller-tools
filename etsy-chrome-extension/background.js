console.log("Background script loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed or updated");
  chrome.contextMenus.create(
    {
      id: "extractOrderData",
      title: "Extract Order Data",
      contexts: ["page"],
      documentUrlPatterns: ["https://*.etsy.com/*"],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Error creating context menu:", chrome.runtime.lastError);
      } else {
        console.log("Context menu created successfully");
      }
    }
  );
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked", info, tab);
  if (info.menuItemId === "extractOrderData") {
    chrome.tabs.sendMessage(tab.id, { action: "getOrderData" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        // If the content script is not ready, inject it and try again
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ["content.js"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error injecting content script:",
                chrome.runtime.lastError
              );
            } else {
              console.log("Content script injected, retrying message");
              // Try sending the message again after a short delay
              setTimeout(() => {
                chrome.tabs.sendMessage(
                  tab.id,
                  { action: "getOrderData" },
                  (response) => {
                    if (chrome.runtime.lastError) {
                      console.error(
                        "Error sending message after injection:",
                        chrome.runtime.lastError
                      );
                    } else {
                      console.log("Message sent successfully after injection");
                    }
                  }
                );
              }, 100);
            }
          }
        );
      } else {
        console.log("Message sent successfully");
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractOrderData") {
    handleExtractOrderData(request, sender);
  }
});

async function handleExtractOrderData(request, sender) {
  try {
    const result = await chrome.storage.sync.get(["apiKey"]);
    if (!result.apiKey) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "showAlert",
        message: "Please set your OpenRouter API key in the extension popup.",
      });
      return;
    }

    let expectedFormat = JSON.stringify({
      recipient: {
        name: "",
        address: "",
        city: "",
        zipCode: "",
        country: "",
      },
      order: {
        description: "",
        quantity: "",
        weight: "",
        value: "",
      },
    });

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${result.apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-4",
          messages: [
            {
              role: "user",
              content: `Extract and summarize the key order details from the following HTML content of an Etsy order page:\n\n${request.orderData}\n\nProvide format like this: ${expectedFormat}. For the value use "item total" field, even if there are multiple items in the order.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      );
    }

    const data = await response.json();
    console.log("API response:", data);
    chrome.tabs.sendMessage(sender.tab.id, {
      action: "showAlert",
      message:
        "Etsy order data analysis:\n\n" + data.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error details:", error);
    chrome.tabs.sendMessage(sender.tab.id, {
      action: "showAlert",
      message:
        "An error occurred while analyzing Etsy order data: " + error.message,
    });
  }
}
