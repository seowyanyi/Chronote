'use strict';

var StorageArea = chrome.storage.local;

StorageArea.get("highlight", function(items) {
    console.log(items);
    setButtonText(items.highlight);
});

console.log('\'Allo \'Allo! Popup');

document.getElementById("toggleButton").addEventListener("click",toggleMode);


function toggleMode() {
    StorageArea.get("highlight", function(items) {
        var newState = !items.highlight;

        setStorage(newState);
        setButtonText(newState);
    });
}

function setStorage(state) {
    StorageArea.set({'highlight': state});
}

function setButtonText(state) {
    var button = document.getElementById("toggleButton");
    if (state) {
        button.textContent = "Highlight Mode Off";
    } else {
        button.textContent = "Highlight Mode On";
    }
}

