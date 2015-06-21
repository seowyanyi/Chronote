'use strict';
//////////////////// CONSTANTS ///////////////////
var STORAGE_HIGHLIGHT_MODE = "highlightMode";
var HIGHLIGHT_CLASS = "chronoteHighlight";
var HIGHLIGHT_COLOR = "yellow";
var DEFAULT_COLOR = "transparent";
/////////////////////////////////////////////////

var rangy = require('rangy');
var highlighterMod = require('../../node_modules/rangy/lib/rangy-highlighter.js');
var classapplierMod = require('../../node_modules/rangy/lib/rangy-classapplier.js');
var StorageArea = chrome.storage.local;
var highlighter;


rangy.init();
initHighlighter();
restoreHighlights();
addClearAllListener();
addClickEventListener();
addToggleModeListener();

function initHighlighter() {
    highlighter = rangy.createHighlighter();
    highlighter.addClassApplier(rangy.createClassApplier(HIGHLIGHT_CLASS, {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"]
    }));
}

function restoreHighlights() {
    chrome.runtime.sendMessage({getCurrentUrl: true}, function(response) {
        var url = response.currentUrl;
        StorageArea.get(url, function(items) {
            var serializedHighlight = items[url];
            if (serializedHighlight != null && serializedHighlight != "type:textContent" ) {
                highlighter.deserialize(serializedHighlight);
                styleHighlightedText();
            }
        });
    });
}

function highlightIfNeeded() {
    //todo: check if there is anything new to store

    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        if (items[STORAGE_HIGHLIGHT_MODE]) {
            highlighter.highlightSelection(HIGHLIGHT_CLASS);
            styleHighlightedText();
            storeHighlights(highlighter.serialize());
        }
    });
}

function storeHighlights(serializedString) {
    // content scripts cannot use chrome.tabs
    // got to ask background scripts to do it for us
    chrome.runtime.sendMessage({getCurrentUrl: true}, function(response) {
        var highlights = {};
        highlights[response.currentUrl] = serializedString;
        StorageArea.set(highlights);
    });
}

function clearStoredHighlights() {
    chrome.runtime.sendMessage({getCurrentUrl: true}, function(response) {
        console.log('------------------');
        StorageArea.remove(response.currentUrl);
        highlighter.removeAllHighlights();
    });
}

function styleHighlightedText() {
    var elements = document.getElementsByClassName(HIGHLIGHT_CLASS);

    for (var i=0; i < elements.length; ++i) {
        elements[i].style.backgroundColor = HIGHLIGHT_COLOR;
    }
}

function unstyleHighlightedText() {
    var elements = document.getElementsByClassName(HIGHLIGHT_CLASS);

    for (var i=0; i < elements.length; ++i) {
        elements[i].style.backgroundColor = DEFAULT_COLOR;
    }
}

function addClickEventListener() {
    document.addEventListener("click", highlightIfNeeded, false);
}

function addClearAllListener() {
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {

            if (request.clearAll) {
                clearAllHighlights();
            }
        });
}

function addToggleModeListener() {
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log('requested');
            if (request.action === "toggleMode") {
                toggleMode(); //todo: share code with popup.js
            }
        });
}

function toggleMode() {
    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        var newState = !items[STORAGE_HIGHLIGHT_MODE];
        saveState(newState);
    });
}

function saveState(state) {
    var newState = {};
    newState[STORAGE_HIGHLIGHT_MODE] = state;

    StorageArea.set(newState);
}

function clearAllHighlights() {
    unstyleHighlightedText();
    clearStoredHighlights();
}

// for debugging purposes
function printEntireStorage() {
    StorageArea.get(null, function(items) {
        for (var x in items) {
            console.log(x + " : " + items[x]);
        }
    });
}