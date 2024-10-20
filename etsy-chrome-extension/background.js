chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed or updated");
  chrome.contextMenus.create(
    {
      id: "extractOrderData",
      title: "Send to Pošta Slovenije",
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
  if (info.menuItemId === "extractOrderData") {
    chrome.tabs.sendMessage(tab.id, { action: "getOrderData" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
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

    chrome.tabs.create(
      { url: "https://uvoz-izvoz.posta.si/en/export/shipment/edit" },
      function (newTab) {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === newTab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: async (stringifiedData) => {
                while (document.querySelectorAll("button").length < 2) {
                  await new Promise((resolve) => setTimeout(resolve, 50));
                }

                await new Promise((resolve) => setTimeout(resolve, 100));

                Array.from(document.querySelectorAll("button"))[1].click();

                let termsCheckbox = document.getElementById("terms");
                termsCheckbox.click();

                const submitButton = document.querySelector(
                  'button[type="submit"]'
                );
                submitButton.click();

                while (!document.querySelector(".t-form-container")) {
                  await new Promise((resolve) => setTimeout(resolve, 150));
                }

                let inputData = JSON.parse(stringifiedData);

                inputData.sender = {
                  name: "Matic Jurglic",
                  address: "Draga pri Sentrupertu 1A",
                  city: "Sentrupert",
                  zipCode: "8232",
                  country: "SLOVENIA",
                  email: "matic@jurglic.si",
                };

                inputData.order.quantity = 1;
                inputData.order.weight = 0.5;
                inputData.order.description = "Handmade art";

                await new Promise((resolve) => setTimeout(resolve, 500)); // wait until page is settled

                function simulateTyping(element, value) {
                  element.focus();
                  element.value = "";
                  element.dispatchEvent(new Event("focus"));
                  for (let i = 0; i < value.length; i++) {
                    element.value += value[i];
                    element.dispatchEvent(
                      new Event("input", { bubbles: true })
                    );
                    element.dispatchEvent(
                      new KeyboardEvent("keydown", { key: value[i] })
                    );
                    element.dispatchEvent(
                      new KeyboardEvent("keyup", { key: value[i] })
                    );
                  }
                  element.dispatchEvent(new Event("change", { bubbles: true }));
                  element.blur();
                  element.dispatchEvent(new Event("blur", { bubbles: true }));
                }

                function setValue(selector, value) {
                  const element = document.querySelector(selector);
                  if (element) {
                    simulateTyping(element, value);
                  }
                }

                function selectRadioButton(labelText) {
                  const labels = document.querySelectorAll(
                    "label.form-check-label"
                  );
                  for (const label of labels) {
                    if (label.textContent.trim() === labelText) {
                      const radio = label.querySelector('input[type="radio"]');
                      if (radio) {
                        radio.focus();
                        radio.checked = true;
                        radio.dispatchEvent(
                          new Event("change", { bubbles: true })
                        );
                        radio.click();
                        radio.blur();
                        console.log(`"${labelText}" radio button selected`);
                        return true;
                      }
                    }
                  }
                  console.log(`Could not find "${labelText}" radio button`);
                  return false;
                }

                async function setCountry(selector, value) {
                  const combobox = document.querySelector(selector);

                  combobox.querySelector("button").click();

                  await new Promise((resolve) => setTimeout(resolve, 300));
                  debugger;
                  const listItems =
                    document.querySelectorAll("kendo-list ul li");
                  for (const item of listItems) {
                    if (item.textContent.trim() === value.toUpperCase()) {
                      item.click();
                      break;
                    }
                  }
                }

                function setKendoNumericTextBoxValue(selector, value) {
                  const numericTextBox = document.querySelector(selector);
                  if (numericTextBox) {
                    const input = numericTextBox.querySelector("input");
                    if (input) {
                      simulateTyping(input, value.toString());

                      const increaseButton = numericTextBox.querySelector(
                        ".k-spinner-increase"
                      );
                      const decreaseButton = numericTextBox.querySelector(
                        ".k-spinner-decrease"
                      );
                      if (increaseButton && decreaseButton) {
                        increaseButton.click();
                        setTimeout(() => decreaseButton.click(), 100);
                      }
                    }
                  }
                }

                async function setAllValues() {
                  setValue(
                    'input[name="consignee.name"]',
                    inputData.recipient.name
                  );
                  setValue(
                    'input[name="consignee.street"]',
                    inputData.recipient.address
                  );
                  setValue(
                    'input[name="consignee.city"]',
                    inputData.recipient.city
                  );
                  setValue(
                    'input[name="consignee.post"]',
                    inputData.recipient.zipCode
                  );

                  setValue('input[name="sender.name"]', inputData.sender.name);
                  setValue(
                    'input[name="sender.street"]',
                    inputData.sender.address
                  );
                  setValue('input[name="sender.city"]', inputData.sender.city);
                  setValue(
                    'input[name="sender.post"]',
                    inputData.sender.zipCode
                  );
                  setValue(
                    'input[name="sender.email"]',
                    inputData.sender.email
                  );

                  setValue(
                    'input[name="shipment.items[].goodsDescription"]',
                    inputData.order.description
                  );

                  setKendoNumericTextBoxValue(
                    'kendo-numerictextbox[name="shipment.items[].quantity"]',
                    inputData.order.quantity
                  );
                  setKendoNumericTextBoxValue(
                    'kendo-numerictextbox[name="shipment.items[].weight"]',
                    inputData.order.weight
                  );
                  setKendoNumericTextBoxValue(
                    'kendo-numerictextbox[name="shipment.items[].amount.amountValue"]',
                    inputData.order.value
                  );

                  selectRadioButton("Sale of goods");
                  await new Promise((resolve) => setTimeout(resolve, 100));

                  selectRadioButton("Tracked");

                  setCountry(
                    "#consignee\\.countryCode",
                    inputData.recipient.country
                  );
                }

                setAllValues();
              },
              args: [data.choices[0].message.content],
            });
          }
        });
      }
    );
  } catch (error) {
    console.error("Error details:", error);
    chrome.tabs.sendMessage(sender.tab.id, {
      action: "showAlert",
      message:
        "An error occurred while analyzing Etsy order data: " + error.message,
    });
  }
}
