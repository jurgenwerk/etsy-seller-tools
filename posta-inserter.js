
const inputData = {
    recipient: {
        name: "John Doe",
        address: "123 Main St",
        city: "New York",
        zipCode: "10001",
        country: "ZDRUŽENE DRŽAVE AMERIKE"
    },
    sender: {
        name: "Jane Smith",
        address: "456 Elm St",
        city: "Ljubljana",
        zipCode: "1000",
        country: "SLOVENIJA",
        email: "jane.smith@example.com"
    },
    goods: {
        description: "Handmade art",
        quantity: 1,
        weight: 0.5,
        value: 61.9
    }
};

// Function to simulate typing
function simulateTyping(element, value) {
    element.focus();
    element.value = '';
    element.dispatchEvent(new Event('focus'));
    for (let i = 0; i < value.length; i++) {
        element.value += value[i];
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keydown', { key: value[i] }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key: value[i] }));
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
    element.dispatchEvent(new Event('blur', { bubbles: true }));
}

// Function to set values and trigger events
function setValue(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
        simulateTyping(element, value);
    }
}

// Function to select a radio button
function selectRadioButton(labelText) {
    const labels = document.querySelectorAll('label.form-check-label');
    for (const label of labels) {
        if (label.textContent.trim() === labelText) {
            const radio = label.querySelector('input[type="radio"]');
            if (radio) {
                radio.focus();
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
                radio.blur();
                console.log(`"${labelText}" radio button selected`);
                return true;
            }
        }
    }
    console.log(`Could not find "${labelText}" radio button`);
    return false;
}

// Function to set Kendo UI ComboBox value for country
function setCountry(selector, value) {
    const combobox = document.querySelector(selector);
    if (combobox) {
        // Open the dropdown
        combobox.querySelector("button").click();
        
        // Wait for the dropdown to open and then select the matching item
        setTimeout(() => {
            const listItems = document.querySelectorAll('kendo-list ul li');
            for (const item of listItems) {
                if (item.textContent.trim() === value) {
                    item.click();
                    break;
                }
            }
        }, 100);
    }
}

// Function to set Kendo UI NumericTextBox value
function setKendoNumericTextBoxValue(selector, value) {
    const numericTextBox = document.querySelector(selector);
    if (numericTextBox) {
        const input = numericTextBox.querySelector('input');
        if (input) {
            simulateTyping(input, value.toString());
            
            // Simulate clicking the increase and decrease buttons
            const increaseButton = numericTextBox.querySelector('.k-spinner-increase');
            const decreaseButton = numericTextBox.querySelector('.k-spinner-decrease');
            if (increaseButton && decreaseButton) {
                increaseButton.click();
                setTimeout(() => decreaseButton.click(), 100);
            }
        }
    }
}


async function setAllValues() {
    // Set recipient details
    setValue('input[name="consignee.name"]', inputData.recipient.name);
    setValue('input[name="consignee.street"]', inputData.recipient.address);
    setValue('input[name="consignee.city"]', inputData.recipient.city);
    setValue('input[name="consignee.post"]', inputData.recipient.zipCode);
    
    // Wait before setting the country
    await new Promise(resolve => setTimeout(resolve, 100));
    setCountry('#consignee\\.countryCode', inputData.recipient.country);

    // Set sender details
    setValue('input[name="sender.name"]', inputData.sender.name);
    setValue('input[name="sender.street"]', inputData.sender.address);
    setValue('input[name="sender.city"]', inputData.sender.city);
    setValue('input[name="sender.post"]', inputData.sender.zipCode);
    setValue('input[name="sender.email"]', inputData.sender.email);

    // Set description of goods
    setValue('input[name="shipment.items[].goodsDescription"]', inputData.goods.description);

    // Set quantity, weight, and value
    setKendoNumericTextBoxValue('kendo-numerictextbox[name="shipment.items[].quantity"]', inputData.goods.quantity);
    setKendoNumericTextBoxValue('kendo-numerictextbox[name="shipment.items[].weight"]', inputData.goods.weight);
    setKendoNumericTextBoxValue('kendo-numerictextbox[name="shipment.items[].amount.amountValue"]', inputData.goods.value);

    // Wait before setting the country of origin
    await new Promise(resolve => setTimeout(resolve, 100));
    setCountry('#shipment\\.item\\.originCountryCode', inputData.sender.country);

    // Select "Prodaja blaga" radio button
    selectRadioButton('Prodaja blaga');

    // Select "S sledenjem" radio button
    selectRadioButton('S sledenjem');
}


setAllValues();