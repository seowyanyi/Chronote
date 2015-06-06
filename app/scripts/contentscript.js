'use strict';

var rangy = require('rangy');
var highlighterMod = require('../../node_modules/rangy/lib/rangy-highlighter.js');
var classapplierMod = require('../../node_modules/rangy/lib/rangy-classapplier.js');


console.log('\'Allo \'Allo! Content script test');

rangy.init();

console.log(rangy);

var highlighter = rangy.createHighlighter();

highlighter.addClassApplier(rangy.createClassApplier("highlight", {
    ignoreWhiteSpace: true,
    tagNames: ["span", "a"]
}));

function highlightSelectedText() {

    highlighter.highlightSelection("highlight");
    //var style = document.createElement('link');
    //style.rel = 'stylesheet';
    //style.type = 'text/css';
    //style.href = chrome.extension.getURL('highlight.css');
    //(document.head||document.documentElement).appendChild(style);

    var elements = document.getElementsByClassName("highlight");

    for (var i=0; i < elements.length; ++i) {
        elements[i].style.backgroundColor = "yellow";
    }

    console.log("clicked and highlighted");

}


setTimeout(highlightSelectedText, 6000);
