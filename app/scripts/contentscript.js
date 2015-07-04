/**
 * Chronote - google-docs-like editing on web pages
 * https://github.com/seowyanyi/Chronote
 *
 * Copyright 2015, Seow Yan Yi
 * Licensed under the MIT license.
 */
'use strict';
var $ = require('jquery');
var masha = require('./Masha');
var comment = require('./comment');
var datetime = require('./datetime');
require('./lib/pep');
//////////////////// CONSTANTS ///////////////////
var STORAGE_HIGHLIGHT_MODE = "highlightMode";
var DEBOUNCE_LIMIT = 500;
/////////////////////////////////////////////////
//////////////////// GLOBALS ////////////////////
var StorageArea = chrome.storage.local;
var lastHighlight = 0; // for debouncing purposes
/////////////////////////////////////////////////

$(window).load(function() {
    setTimeout(function() {
        masha.init();
        masha.restoreHighlights();
        comment.restoreComments();

        setTimeout(function() {
            addDOMListeners();
            addChromeListeners();
        }, 2000);
    }, 2000);
});

function addDOMListeners() {
    document.addEventListener("mouseup", highlightIfNeeded, false);
    $('#commentBtn').click(addComment);
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

function highlightIfNeeded(e) {
    if (e.target.nodeName == 'INPUT' || e.target.nodeName == 'TEXTAREA') { return; }
    if (isDebounceFail()) { return;}
    masha.highlightSelection();
    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        var isHighlightModeOn = items[STORAGE_HIGHLIGHT_MODE];
        if (isHighlightModeOn) {
            try {
                masha.highlightSelection();
            } catch (err) {
                console.log(err);
            }
        }
    });
}

function addComment() {
    var value = $('#commentForm').val();
    // return if nothing typed
    if ($.trim(value).length == 0) {
        return;
    }
    comment.addComment("http://seowyanyi.org/images/profilepic.jpg",value, datetime.getFuzzyDate(new Date()));
}

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
    location.reload(); //todo: clear w/o reloading
}

function clearAllHighlights() {
    StorageArea.clear();
    location.reload(); //todo: clear w/o reloading
}

// for debugging purposes
function printEntireStorage() {
    var url = window.location.href;
    StorageArea.get(url, function(items) {
        var arr = items[url] || [];
        for (var i=0; i < arr.length; ++i) {
            console.log('==============================');
            console.log(arr[i]);
            console.log('==============================');
        }
    });
}