'use strict';
//////////////////// CONSTANTS ///////////////////
var STORAGE_HIGHLIGHT_MODE = "highlightMode";
var HIGHLIGHT_CLASS = "chronoteHighlight";
/////////////////////////////////////////////////

var rangy = require('rangy');
var rh = require('../../node_modules/rangy/lib/rangy-highlighter.js');
var rca = require('../../node_modules/rangy/lib/rangy-classapplier.js');
var rsm = require('../../node_modules/rangy/lib/rangy-serializer.js');
var StorageArea = chrome.storage.local;
var highlighter;

rangy.init();
initHighlighter();
restoreHighlights();
addClearAllListener();
addMouseUpEventListener();
addToggleModeListener();

function initHighlighter() {
    highlighter = rangy.createHighlighter();
    highlighter.addClassApplier(rangy.createClassApplier(HIGHLIGHT_CLASS, {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"]
    }));
}

function restoreHighlights() {
    var url = window.location.href;
    StorageArea.get(url, function(items) {
        var serializedHighlight = items[url];
        if (serializedHighlight != null && serializedHighlight != "type:textContent" ) {
            highlighter.deserialize(serializedHighlight);
        }
    });
}

function getAllCreatedElements(selection) {
    var nodes = selection.getRangeAt(0).getNodes(false, function (el) {
        return el.parentNode && el.parentNode.className == HIGHLIGHT_CLASS;
    });

    var spans = [];

    for (var i = 0; i < nodes.length; i++) {
        spans.push(nodes[i].parentNode);
    }
    return spans;
}

// To identify a particular highlighted section
function addIdentifyingClass(elems, className) {
    for (var i = 0; i < elems.length; ++i) {
        elems[i].className += ' ' + className;
    }
}

function highlightIfNeeded(e) {
    var sel = rangy.getSelection();

    if (isNotSelectable(e.target.nodeName, sel)) {
        return;
    }

    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        if (items[STORAGE_HIGHLIGHT_MODE]) {
            highlighter.highlightSelection(HIGHLIGHT_CLASS, {selection: sel});
            var identifyingClass = rangy.serializeSelection(sel);
            addIdentifyingClass(getAllCreatedElements(sel), identifyingClass);
            addSelectionEvents(identifyingClass);
            var serialized = highlighter.serialize(); //todo: currently does not include hover class
            storeHighlights(serialized);
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
    return (nodeName == 'INPUT' || trimmed == '' || trimmed == undefined);
}

function storeHighlights(serializedString) {
    var highlights = {};
    highlights[window.location.href] = serializedString;
    StorageArea.set(highlights);
}

function clearStoredHighlights() {
    StorageArea.remove(window.location.href);
}

function addSelectionEvents(class_name) { //adapted from MaSha by SmartTeleMax
    var timeoutHover=false;
    var this_ = this;

    var wrappers = byClassName(document, class_name);
    for (var i=wrappers.length;i--;){
        addEvent(wrappers[i], 'mouseover', function(){
            for (var i=wrappers.length;i--;){
                addClass(wrappers[i], 'hover');
            }
            window.clearTimeout(timeoutHover);
        });
        addEvent(wrappers[i], 'mouseout', function(e){
            // mouseleave
            var t = e.relatedTarget;
            while (t && t.parentNode && t.className != this.className){
                t = t.parentNode;
            }
            if (!t || t.className != this.className){
                timeoutHover = window.setTimeout(function(){
                    for (var i=wrappers.length;i--;){
                        removeClass(wrappers[i], 'hover');
                    }
                }, 50);
            }
        });
    }

    var closer = document.createElement('a');
    closer.className = 'txtsel_close';
    closer.href = '#';
    var closer_span = document.createElement('span');
    closer_span.className = 'closewrap';
    closer_span.appendChild(closer);
    addEvent(closer, 'click', function(e){
        preventDefault(e);
        deleteSelections([class_name]);

    });
    wrappers[wrappers.length-1].appendChild(closer_span);

    window.getSelection().removeAllRanges();
}
function preventDefault(e){
    if (e.preventDefault) { e.preventDefault(); }
    else { e.returnValue = false; }
}
function deleteSelections(numclasses){
    for(var i=numclasses.length; i--;){
        var numclass = numclasses[i];
        var spans = byClassName(document, numclass);
        var closewrap = firstWithClass(spans[spans.length-1], 'closewrap');
        closewrap.parentNode.removeChild(closewrap);

        removeTextSelection(spans);
    }
}

function elementIterator(parent, cont, end, reversed){
    reversed = !!reversed;
    cont = cont || parent[reversed? 'lastChild' : 'firstChild'];
    var finished = !cont;
    var up = false;

    function next(){
        if (finished) {return null;}
        var result = cont;
        if (cont.childNodes && cont.childNodes.length && !up){
            cont = cont[reversed? 'lastChild' : 'firstChild'];
        } else if (cont[reversed? 'previousSibling' : 'nextSibling']){
            cont = cont[reversed? 'previousSibling' : 'nextSibling'];
            up = false;
        } else if (cont.parentNode){
            cont = cont.parentNode;
            if (cont === parent){ finished = true; }
            up = true;
            next();
        }
        if (result === end) { finished = true; }
        return result;
    }
    return next;
}

function firstWithClass(elem, cls){
    var iter = elementIterator(elem);
    var node = null;
    while ((node = iter())){
        if (node.nodeType === 1 && hasClass(node, cls)) {return node;}
    }
    return null;
}
function hasClass(elem, cls){
    var reg = _classRegExp(cls);
    return reg.test(elem.className);
}

function removeTextSelection(spans){
    for (var i=spans.length; i--;){
        var span = spans[i];
        for (var j=0; j<span.childNodes.length;j++){
            span.parentNode.insertBefore(span.childNodes[j], span);
        }
        span.parentNode.removeChild(span);
    }
}

function addEvent(elem, type, fn){
    if (elem.addEventListener) {
        elem.addEventListener(type, fn, false);
    } else if (elem.attachEvent) {
        elem.attachEvent("on" + type, fn);
    }
}
function byClassName(elem, cls){
    if (elem.getElementsByClassName){
        return elem.getElementsByClassName(cls);
    } else {
        var ret = [], node;
        var iter = elementIterator(elem);
        while ((node = iter())){
            if (node.nodeType == 1 && hasClass(node, cls)) {
                ret.push(node);
            }
        }
        return ret;
    }
}

function trim(text) {
    return (text || "").replace(/^\s+|\s+$/g, "");
}

function _classRegExp(cls){
    return new RegExp('(^|\\s+)'+cls+'(?:$|\\s+)', 'g');
}

function addClass(elem, cls){
    // XXX attention! NOT UNIVERSAL!
    // don't use for classes with non-literal symbols
    var reg = _classRegExp(cls);
    if (!reg.test(elem.className)){
        elem.className = elem.className + ' ' + cls;
    }
}
function removeClass(elem, cls){
    // XXX attention! NOT UNIVERSAL!
    // don't use for classes with non-literal symbols
    var reg = _classRegExp(cls);
    if (reg.test(elem.className)){
        elem.className = trim(elem.className.replace(reg, '$1'));
    }
}
function addMouseUpEventListener() {
    document.addEventListener("mouseup", highlightIfNeeded, false);
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