'use strict';
//////////////////// CONSTANTS ///////////////////
var STORAGE_HIGHLIGHT_MODE = "highlightMode";
/////////////////////////////////////////////////

var StorageArea = chrome.storage.local;

initButton();

console.log('\'Allo \'Allo! Popup access test');
document.getElementById("toggleButton").addEventListener("click",toggleMode);

function initButton() {
    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        console.log(items);

        setButtonText(items.highlightMode);
    });
}

function toggleMode() {
    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        console.log(items);
        console.log(items[STORAGE_HIGHLIGHT_MODE]);
        var newState = !items[STORAGE_HIGHLIGHT_MODE];

        setStorage(newState);
        setButtonText(newState);
    });
}

function setStorage(state) {
    var newState = {};
    newState[STORAGE_HIGHLIGHT_MODE] = state;

    StorageArea.set(newState);
}

function setButtonText(state) {
    var button = document.getElementById("toggleButton");
    if (state) {
        button.textContent = "Turn Highlight Mode Off";
    } else {
        button.textContent = "Turn Highlight Mode On";
    }
}

