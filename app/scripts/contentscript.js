/**
 * Chronote - google-docs-like editing on web pages
 * https://github.com/seowyanyi/Chronote
 *
 * Copyright 2015, Seow Yan Yi
 * Licensed under the MIT license.
 */
'use strict';

var rangy = require('rangy');
var require_rangy_serializer = require('../../node_modules/rangy/lib/rangy-serializer.js');
var masha = require('./Masha.js');

//////////////////// CONSTANTS ///////////////////
var STORAGE_HIGHLIGHT_MODE = "highlightMode";
var DEBOUNCE_LIMIT = 500;
var RESTORE_BUFFER_INTERVAL = 1000;
var MAX_RESTORE_ATTEMPTS = 3;
/////////////////////////////////////////////////
//////////////////// GLOBALS ////////////////////
var StorageArea = chrome.storage.local;
var lastHighlight = 0; // for debouncing purposes
var highlightsOnPage = [];
var restoreAttempts = {}; // keep track of misbehaving deserializations
/////////////////////////////////////////////////

rangy.init();
//setTimeout(restoreHighlights, 0); // need to wait for chrome StorageArea to be ready. //todo: is there another way?
addChromeListeners();
addDOMListeners();


/**
 * Debounce necessary because certain user actions result
 * in rapid, unintentional selections
 */
function isDebounceFail() {
    var curTime = new Date();
    if (curTime - lastHighlight < DEBOUNCE_LIMIT) {
        return true;
    }
    lastHighlight = curTime;
    return false;
}

function restoreHighlights() {
    var url = window.location.href;
    StorageArea.get(url, function(items) {
        var savedSelectionsArr = items[url] || [];

        for (var i=0; i < savedSelectionsArr.length; ++i) {
            restoreAttempts[savedSelectionsArr[i]] = 0;
        }

        restore(savedSelectionsArr);
    });
}

function restore(sels) { // todo: finish this
    var failedRestorations = [];
    for (var i = 0; i < sels.length; ++i) {
        if (restoreAttempts[sels[i]] === MAX_RESTORE_ATTEMPTS) {
            // current highlight corrupted. Possibly due to change in DOM/contents.
            console.log('max');
            // todo: inform user
            // todo: clear only the corrupted highlight
            continue;
        }
        console.log(sels[i] + '  ATTEMPTS: ' + restoreAttempts[sels[i]]);

        restoreAttempts[sels[i]]++;

        try {
            // Not using rangy.canDeserializeSelection as it isn't accurate.
            var sel = rangy.deserializeSelection(sels[i]);
            masha.highlightSelection(sel);
        } catch (err) {
            failedRestorations.push(sels[i]);
        }
    }

    if (failedRestorations.length > 0) {
        //Try again after a short while. Some elements might not have loaded
        setTimeout(restore(failedRestorations), RESTORE_BUFFER_INTERVAL);
    }
}

function highlightIfNeeded(e) {
    var sel = rangy.getSelection();
    if (isNotSelectable(e.target.nodeName, sel)) { return;}
    if (isDebounceFail()) { return;}

    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        if (items[STORAGE_HIGHLIGHT_MODE]) {
            var serializedSel = masha.highlightSelection(sel);
            highlightsOnPage.push(serializedSel);
            storeHighlights(highlightsOnPage);
        }
    });
}


/**
 * Checks whether a selection is valid
 * @param nodeName, the name of the event node
 * @param sel, the rangy (or native) selection object
 * @returns true if we are in a input field or if the selection does not have text
 */
function isNotSelectable(nodeName, sel) {
    var trimmed = sel.toString().replace(/\s/g, "") ; // remove whitespace
    return nodeName == 'INPUT' || trimmed == '' || trimmed == undefined;
}

/**
 * Given an array of serialized highlights, store into chromes' local storage
 * @param array
 */
function storeHighlights(array) {
    var highlights = {};
    highlights[window.location.href] = array;
    StorageArea.set(highlights);
}

function addDOMListeners() {
    document.addEventListener("mouseup", highlightIfNeeded, false);
    window.addEventListener('load', restoreHighlights, false);
}

function addChromeListeners() {
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if (request.action === "toggleMode") {
                toggleMode(); //todo: share code with popup.js
            } else if (request.action === "clearAll") {
                clearAllHighlights();
            } else if (request.action === "clearCurrent") {
                clearCurrentHighlights();
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

function clearCurrentHighlights() {
    StorageArea.remove(window.location.href);
}

function clearAllHighlights() {
    StorageArea.clear();
}

// for debugging purposes
function printEntireStorage() {
    StorageArea.get(null, function(items) {
        for (var x in items) {
            console.log(x + " : " + items[x]);
        }
    });
}