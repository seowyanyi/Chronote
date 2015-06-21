/**
 * Chronote - google-docs-like editing on web pages
 * https://github.com/seowyanyi/Chronote
 *
 * Copyright 2015, Seow Yan Yi
 * Licensed under the MIT license.
 */
'use strict';
//////////////////// CONSTANTS ///////////////////
var STORAGE_HIGHLIGHT_MODE = "highlightMode";
/////////////////////////////////////////////////

var StorageArea = chrome.storage.local;

initButton();

console.log('\'Allo \'Allo! Popup access test');
document.getElementById("toggleButton").addEventListener("click",toggleMode);
document.getElementById("clearAllButton").addEventListener("click",sendClearAllMsg);
document.getElementById("clearCurrentButton").addEventListener("click",sendClearCurrMsg);


// Tells content script to clear highlights
function sendClearAllMsg() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "clearAll"});
    });
}

function sendClearCurrMsg() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "clearCurrent"});
    });
}

function initButton() {
    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        setButtonText(items.highlightMode);
    });
}

function toggleMode() {
    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        var newState = !items[STORAGE_HIGHLIGHT_MODE];
        saveState(newState);
        setButtonText(newState);
    });
}

function saveState(state) {
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

