'use strict';
//////////////////// CONSTANTS ///////////////////
var STORAGE_SERIALIZED_STRING = "serializedString";
var STORAGE_HIGHLIGHT_MODE = "highlightMode";
var HIGHLIGHT_CLASS = "chronoteHighlight";
var HIGHLIGHT_COLOR = "yellow";
/////////////////////////////////////////////////

var rangy = require('rangy');
var highlighterMod = require('../../node_modules/rangy/lib/rangy-highlighter.js');
var classapplierMod = require('../../node_modules/rangy/lib/rangy-classapplier.js');
var StorageArea = chrome.storage.local;
var highlighter;


console.log('\'Allo \'Allo! Content script test');

rangy.init();
initHighlighter();
restoreHighlights();
document.addEventListener("click", highlightIfNeeded, false);




function initHighlighter() {
    highlighter = rangy.createHighlighter();
    highlighter.addClassApplier(rangy.createClassApplier(HIGHLIGHT_CLASS, {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"]
    }));
}

function restoreHighlights() {
    StorageArea.get(STORAGE_SERIALIZED_STRING, function(items) {
        if (items[STORAGE_SERIALIZED_STRING]) {
            highlighter.deserialize(items[STORAGE_SERIALIZED_STRING]);
            styleHighlightedText();
        }
    });
}

function highlightIfNeeded() {
    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        if (items[STORAGE_HIGHLIGHT_MODE]) {
            highlighter.highlightSelection(HIGHLIGHT_CLASS);
            styleHighlightedText();
            storeHighlights(highlighter.serialize());
        }
    });
}

function storeHighlights(serializedString) {
    var highlights = {};
    highlights[STORAGE_SERIALIZED_STRING] = serializedString;
    StorageArea.set(highlights);
}

function styleHighlightedText() {
    var elements = document.getElementsByClassName(HIGHLIGHT_CLASS);

    for (var i=0; i < elements.length; ++i) {
        elements[i].style.backgroundColor = HIGHLIGHT_COLOR;
    }
}

