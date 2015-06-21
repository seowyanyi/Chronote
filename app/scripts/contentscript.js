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
var HIGHLIGHT_CLASS = "chronoteHighlight";
/////////////////////////////////////////////////

var rangy = require('rangy');
var rsm = require('../../node_modules/rangy/lib/rangy-serializer.js');
var StorageArea = chrome.storage.local;
var DEBOUNCE_LIMIT = 500;
var lastHighlight = 0; // for debouncing purposes
var REGEXP = "[^\\s,;:\u2013.!?<>\u2026\\n\u00a0\\*]+";
var highlightsOnPage = [];

rangy.init();
setTimeout(restoreHighlights, 600); // need to wait for chrome StorageArea to be ready. //todo: is there another way?
addChromeListeners();
addMouseUpEventListener();

//todo: refactor and organize code


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
    printEntireStorage();
    var url = window.location.href;
    StorageArea.get(url, function(items) {
        var lastSavedSelections = items[url] || [];
        for (var i=0; i < lastSavedSelections.length; ++i) {
            if (rangy.canDeserializeSelection(lastSavedSelections[i])) {
                var sel = rangy.deserializeSelection(lastSavedSelections[i]);
                highlightSelection(sel);
            }
        }
    });
}


function highlightIfNeeded(e) {
    var sel = rangy.getSelection();
    if (isNotSelectable(e.target.nodeName, sel)) { return;}
    if (isDebounceFail()) { return;}

    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        if (items[STORAGE_HIGHLIGHT_MODE]) {
            highlightSelection(sel);

            //
            //tostore.push(sel);
            //var serialized = serializeSelection();

            //var serialized = highlighter.serialize();
            // todo: currently serialization does not include hover class
            //todo: but nvm, can just reapply everything. But we need to store selections, not highlights.
            // todo: thus when deserializing, pop out each selection, apply highlight if needed
            //storeHighlights(serialized);
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

function storeHighlights() {
    var highlights = {};
    highlights[window.location.href] = highlightsOnPage;
    StorageArea.set(highlights);
}

function addMouseUpEventListener() {
    document.addEventListener("mouseup", highlightIfNeeded, false);
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

//////////////////////////////////////////////////////////////////////////////
////////// Ported from MaSha by SmartTeleMax for use in Chronote//////////////
//////////////////////////////////////////////////////////////////////////////
//todo: place this in a different file
function highlightSelection(sel) {
    var range = getFirstRange(sel.nativeSelection);
    range = checkSelection(range);
    range = mergeSelections(range);

    // serializedSel serves two purposes:
    // 1. to act as a unique class name,
    // 2. for data persistence
    var serializedSel = rangy.serializeSelection(sel, true);
    range.wrapSelection(serializedSel + ' ' + HIGHLIGHT_CLASS);
    addSelectionEvents(serializedSel);
    highlightsOnPage.push(serializedSel);
    storeHighlights();
}

function checkSelection(range) {
    /*
     * Corrects selection.
     * Returns range object
     */
    checkPosition(range, range.startOffset, range.startContainer, 'start');
    checkPosition(range, range.endOffset, range.endContainer, 'end');

    checkBrackets(range);
    checkSentence(range);

    return range;
}
function checkBrackets(range) {
    _checkBrackets(range, '(', ')', /\(|\)/g, /\(x*\)/g);
    _checkBrackets(range, "\u00ab", "\u00bb", /\\u00ab|\\u00bb/g, /\u00abx*\u00bb/g);
    // XXX Double brackets?
}
function _checkBrackets (range, ob, cb, match_reg, repl_reg){
    // XXX Needs cleanup!
    var text = range.toString();//getTextNodes(range).map(function(x){return x.data;}).join('');
    var brackets = text.match(match_reg);
    var new_data;
    if (brackets){
        brackets = brackets.join('');
        var l = brackets.length +1;
        while(brackets.length < l){
            l = brackets.length;
            brackets = brackets.replace(repl_reg, 'x');
        }
        if (brackets.charAt(brackets.length-1) == cb &&
            text.charAt(text.length-1) == cb){
            if(range.endOffset == 1) {
                new_data = prevNode(range.endContainer);
                range.setEnd(new_data.container, new_data.offset);
            } else {
                range.setEnd(range.endContainer, range.endOffset-1);
            }
        }
        if (brackets.charAt(0) == ob &&
            text.charAt(0) == ob){
            if(range.startOffset == range.startContainer.data.length) {
                new_data = nextNode(range.endContainer);
                range.setStart(new_data.container, new_data.offset);
            } else {
                range.setStart(range.startContainer, range.startOffset+1);
            }
        }
    }

}
function checkSentence(range){
    if (range.startContainer.data === undefined ||
        range.endContainer.data === undefined) {
        return;
    }

    var data, nextAfterRange;
    if(range.endOffset == range.endContainer.data.length) {
        data = nextNode(range.endContainer, /.*/);
        if(!data) {return null;}
        nextAfterRange = data._container.data.charAt(0);
    } else {
        data = {_container: range.endContainer, _offset: range.endOffset};
        nextAfterRange = range.endContainer.data.charAt(range.endOffset);
    }

    if (nextAfterRange.match(/\.|\?|\!/)){
        // sentence end detected
        // XXX rewrite
        var text = range.toString();
        // XXX support not only latin and russian?
        if (text.match(/(\.|\?|\!)\s+[A-Z\u0410-\u042f\u0401]/)){
            return apply();
        }

        if (range.startOffset == 0 &&
            range.startContainer.previousSibling &&
            range.startContainer.previousSibling.nodeType == 1 &&
            hasClass(range.startContainer.previousSibling, 'masha_index')){
            return apply();
        }

        var node, iterator = range.getElementIterator();
        while ((node=iterator())) {
            if (node.nodeType == 1 && hasClass(node, 'masha_index')){
                return apply();
            }
        }

        if (text.charAt(0).match(/[A-Z\u0410-\u042f\u0401]/)){
            var pre = range.startContainer.data.substring(0, range.startOffset);
            if(!pre.match(/\S/)) {
                var pre_data = prevNode(range.startContainer, /\W*/);
                pre = pre_data._container.data;
            }
            pre = trim(pre);
            if (pre.charAt(pre.length-1).match(/(\.|\?|\!)/)){
                return apply();
            }
        }
        return null;
    }

    function apply(){
        range.setEnd(data._container, data._offset+1);
    }
}

function prevNode(cont, regexp) {
    return _siblingNode(cont, 'previous', 'last', 1, regexp);
}
function nextNode(cont, regexp) {
    return _siblingNode(cont, 'next', 'first', 0, regexp);
}
function _siblingNode(cont, prevnext, firstlast, offs, regexp) {
    regexp = regexp || REGEXP;
    while (cont.parentNode && isInternal(cont)){
        while (cont[prevnext + 'Sibling']){
            cont = cont[prevnext + 'Sibling'];
            while (cont.nodeType == 1 && cont.childNodes.length){
                cont = cont[firstlast + 'Child'];
            }
            if(cont.nodeType == 3 &&
                (cont.data.match(regexp) != null)){
                return {_container: cont, _offset: offs * cont.data.length};
            }
        }
        cont = cont.parentNode;
    }
    return null;
}
function isInternal(node) {
    while (node.parentNode){
        if (node == document){
            return true;
        }
        node = node.parentNode;
    }
    return false;
}
function checkPosition(range, offset, container, position) {
    var this_ = this, newdata;

    function isWord(str){
        return str.match(REGEXP) != null;
    }

    function isNotWord(str){
        return str.match(REGEXP) == null;
    }

    function stepBack(container, offset, condition) {
        // correcting selection stepping back and including symbols
        // that match a given condition
        while (offset > 0 && condition(container.data.charAt(offset-1))){
            offset--;
        }
        return offset;
    }

    function stepForward(container, offset, condition) {
        // correcting selection stepping forward and including symbols
        // that match a given condition
        while (offset < container.data.length && condition(container.data.charAt(offset))){
            offset++;
        }
        return offset;
    }
    if (container.nodeType == 1 && offset > 0){
        // Triple click handling for elements like <br>
        if(offset < container.childNodes.length){
            container = container.childNodes[offset];
            offset = 0;
        } else {
            // XXX what is the case for this code?
            var containerTextNodes = textNodes(container); // XXX lastTextNode
            if (containerTextNodes.length){ // this if fixes regressionSelectionStartsAtImage test
                container = containerTextNodes[containerTextNodes.length-1];
                offset = container.data.length;
            }
        }
    }

    if (position == 'start') {

        if (container.nodeType == 1 && trim(textContent(container)) != '') {
            container = firstTextNode(container);
            offset = 0;
        }
        if (container.nodeType != 3 ||
            container.data.substring(offset).match(REGEXP) == null) {
            newdata = nextNode(container);
            if (newdata == null) { return;}
            container = newdata._container;
            offset = newdata._offset;
        }

        // Important! Shorten the selection first and then extend it!
        offset = stepForward(container, offset, isNotWord);
        offset = stepBack(container, offset, isWord);

        range.setStart(container, offset);
    }

    if (position == 'end') {
        if (container.nodeType == 1 && trim(textContent(container)) != '' && offset != 0) {
            container = container.childNodes[range.endOffset-1];

            var containerTextNodes = textNodes(container); // XXX lastTextNode
            container = containerTextNodes[containerTextNodes.length-1];

            offset = container.data.length;
        }

        if (container.nodeType != 3 ||
            container.data.substring(0, offset).match(REGEXP) == null) {
            newdata = prevNode(container);
            if (newdata == null) { return;}
            container = newdata._container;
            offset = newdata._offset;
        }

        // Important! Shorten the selection first and then extend it!
        offset = stepBack(container, offset, isNotWord);
        offset = stepForward(container, offset, isWord);

        range.setEnd(container, offset);
    }
}
function textContent(elem){
    return elem.textContent || elem.innerText;
}
function getFirstRange(sel) {
    return sel.rangeCount ? sel.getRangeAt(0) : null;
}

function mergeSelections(range){
    var merges = [];
    var iterator = range.getElementIterator();
    var node = iterator();
    var last = node;
    var parent_ = parentWithClass(node, 'user_selection_true');
    if (parent_){
        parent_ = /(num\d+)(?:$| )/.exec(parent_.className)[1];
        range.setStart(firstTextNode(firstWithClass(document, parent_)), 0);
        merges.push(parent_);
    }
    while (node){
        if (node.nodeType == 1 && hasClass(node, 'user_selection_true')){
            var cls = /(num\d+)(?:$|)/.exec(node.className)[0];
            if (inArray(cls, merges) == -1){
                merges.push(cls);
            }
        }
        last = node;
        node = iterator();
    }
    last = parentWithClass(last, 'user_selection_true');
    if (last){
        last = /(num\d+)(?:$| )/.exec(last.className)[1];
        var tnodes = textNodes(lastWithClass(document, last)); // XXX lastTextNode
        var lastNode = tnodes[tnodes.length-1];
        range.setEnd(lastNode, lastNode.length);
    }
    if (merges.length){
        // this breaks selection, so we need to dump a range and restore it after DOM changes
        var sc = range.startContainer, so=range.startOffset,
            ec = range.endContainer, eo = range.endOffset;
        deleteSelections(merges);
        range.setStart(sc, so);
        range.setEnd(ec, eo);
    }
    return range;
}
function firstTextNode(elem){
    var iter = elementIterator(elem);
    var node = null;
    while ((node = iter())){
        if (node.nodeType === 3) {return node;}
    }
    return node;
}
function firstWithClass(elem, cls){
    var iter = elementIterator(elem);
    var node = null;
    while ((node = iter())){
        if (node.nodeType === 1 && hasClass(node, cls)) {return node;}
    }
    return null;
}

function _classRegExp(cls){
    return new RegExp('(^|\\s+)'+cls+'(?:$|\\s+)', 'g');
}
function hasClass(elem, cls){
    var reg = _classRegExp(cls);
    return reg.test(elem.className);
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

// XXX sort methods logically
function deleteSelections(numclasses) {
    for (var i = numclasses.length; i--;) {
        var numclass = numclasses[i];
        var spans = byClassName(document, numclass);
        var closewrap = firstWithClass(spans[spans.length - 1], 'closewrap');
        closewrap.parentNode.removeChild(closewrap);

        removeTextSelection(spans);
    }
}

function lastWithClass(elem, cls){
    var elems = byClassName(elem, cls);
    if (elems){
        return elems[elems.length-1];
    }
    return null;
}

function textNodes(elem) {
    var ret = [], node;
    var iter = elementIterator(elem);
    while ((node = iter())){
        if (node.nodeType === 3) {
            ret.push(node);
        }
    }
    return ret;
}
function parentWithClass(p, cls){
    while (p && !hasClass(p, cls)){p = p.parentNode;}
    return p || null;
}

function inArray(elem, array) {
    // from jQuery
    // Hate IE
    for (var i = 0, length=array.length; i < length; i++){
        if (array[i] === elem){ return i; }
    }
    return -1;
}

function addSelectionEvents(class_name) {
    var timeoutHover=false;

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
                }, 100);
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


function trim(text) {
    return (text || "").replace(/^\s+|\s+$/g, "");
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

/*
 * Range object
 */

// support browsers and IE, using ierange with Range exposed
// XXX why this doesn't work without Range exposed
var Range = window.Range || document.createRange().constructor;

Range.prototype.splitBoundaries = function() {
    var sc = this.startContainer,
        so = this.startOffset,
        ec = this.endContainer,
        eo = this.endOffset;
    var startEndSame = (sc === ec);

    if (ec.nodeType == 3 && eo < ec.length) {
        ec.splitText(eo);
    }

    if (sc.nodeType == 3 && so > 0) {
        sc = sc.splitText(so);
        if (startEndSame) {
            eo -= so;
            ec = sc;
        }
        so = 0;
    }
    this.setStart(sc, so);
    this.setEnd(ec, eo);
};

Range.prototype.getTextNodes = function() {
    var iterator = this.getElementIterator();
    var textNodes = [], node;
    while ((node = iterator())){
        // XXX was there a reason to check for empty string?
        // with this check selecting two sibling words separately
        // and then selecting them both in one range doesn't work properly
        if (node.nodeType == 3){// && !node.data.match(/^\s*$/)){
            textNodes.push(node);
        }
    }
    return textNodes;
};

Range.prototype.getElementIterator = function(reversed){
    if (reversed) {
        return elementIterator(null, this.endContainer, this.startContainer, true);
    } else {
        return elementIterator(null, this.startContainer, this.endContainer);
    }
};
Range.prototype.getWordIterator = function(regexp, reversed){
    var elem_iter = this.getElementIterator(reversed);
    var node;
    var counter_aim = 0, i = 0;
    var finished = false, match, this_ = this;
    function next(){
        if(counter_aim == i && !finished){
            do{
                do{
                    node = elem_iter();
                } while(node && node.nodeType != 3);
                finished = !node;
                if (!finished){
                    var value = node.nodeValue;
                    if (node == this_.endContainer){
                        value = value.substr(0, this_.endOffset);
                    }
                    if (node == this_.startContainer){
                        value = value.substr(this_.startOffset);
                    }
                    match = value.match(regexp);
                }
            } while (node && !match);
            if (match){
                counter_aim = reversed? 0: match.length - 1;
                i = reversed? match.length - 1: 0;
            }
        } else {
            if (reversed) {i--;} else {i++;}
        }
        if (finished) { return null; }
        return match[i];
    }
    return next;
};

Range.prototype.wrapSelection = function(className) {
    this.splitBoundaries();
    var textNodes = this.getTextNodes();
    for (var i = textNodes.length; i--;) {
        // XXX wrap sibling text nodes together
        var span = document.createElement('span');
        span.className = className;
        textNodes[i].parentNode.insertBefore(span, textNodes[i]);
        span.appendChild(textNodes[i]);
    }
}

/////////////////////////////////////////////////////////////////////////////
///////////////////////////// MASHA PORT END ////////////////////////////////
/////////////////////////////////////////////////////////////////////////////


