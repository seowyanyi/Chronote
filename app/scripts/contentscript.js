'use strict';

var rangy = require('rangy');
var highlighterMod = require('../../node_modules/rangy/lib/rangy-highlighter.js');
var classapplierMod = require('../../node_modules/rangy/lib/rangy-classapplier.js');
var StorageArea = chrome.storage.local;


console.log('\'Allo \'Allo! Content script test');

rangy.init();

var highlighter = rangy.createHighlighter();

highlighter.addClassApplier(rangy.createClassApplier("highlight", {
    ignoreWhiteSpace: true,
    tagNames: ["span", "a"]
}));

document.addEventListener("click", highlightIfNeeded, false);

function highlightIfNeeded() {
    StorageArea.get("highlight", function(items) {
        console.log('local storage: ' + items.highlight);
        if (items.highlight) {
            highlightSelectedText();
        }
    });

}

function highlightSelectedText() {
    highlighter.highlightSelection("highlight");
    var elements = document.getElementsByClassName("highlight");

    for (var i=0; i < elements.length; ++i) {
        elements[i].style.backgroundColor = "yellow";
    }

    console.log("clicked and highlighted");
}

