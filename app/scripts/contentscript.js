/**
 * Chronote - google-docs-like editing on web pages
 * https://github.com/seowyanyi/Chronote
 *
 * Copyright 2015, Seow Yan Yi
 * Licensed under the MIT license.
 */
'use strict';
var $ = require('jquery');
var rangy = require('rangy');
var masha = require('./Masha.js');
var Mustache = require('mustache');
require('../../node_modules/rangy/lib/rangy-serializer.js');
require('./lib/pep.js');
//////////////////// CONSTANTS ///////////////////
var STORAGE_HIGHLIGHT_MODE = "highlightMode";
var DEBOUNCE_LIMIT = 500;
var RESTORE_BUFFER_INTERVAL = 700;
var MAX_RESTORE_ATTEMPTS = 3;
/////////////////////////////////////////////////
//////////////////// GLOBALS ////////////////////
var StorageArea = chrome.storage.local;
var lastHighlight = 0; // for debouncing purposes
var highlightsOnPage = [];
var restoreAttempts = {}; // keep track of misbehaving deserializations
var failedRestorations = [];
/////////////////////////////////////////////////

rangy.init();
//addChromeListeners();
//addDOMListeners();

$(document).ready(function() {
    setTimeout(function() {
        addChromeListeners();

        $.get(chrome.extension.getURL('/html/comment.mustache'), function(comment) {
            var view = {
                image: 'http://seowyanyi.org/images/profilepic.jpg',
                text: 'nima veniam, quis nostrum exercitationem ullam corp ',
                date: '28 Jun'
            };
            var renderedList = {};
            renderedList["comments"] = [];
            renderedList["comments"].push(Mustache.render(comment, view));
            $.get(chrome.extension.getURL('/html/commentBox.mustache'), function(commentBox) {
                var rendered = Mustache.render(commentBox, renderedList);
                $(rendered).appendTo('body');
                $('.commentBox').pep({
                    cssEaseDuration: 600,
                    velocityMultiplier: 1
                });
            });
        });
        setTimeout(function() {
            addDOMListeners();
        }, 1000);


    }, 2000);
});


function addComment(image, msg, date) {
    var view = {
        image: image,
        text: msg,
        date: date
    };
    $.get(chrome.extension.getURL('/html/comment.mustache'), function(comment) {
        $(".commentList").append(Mustache.render(comment, view));
    });
}

function fuzzyDate(time){
    var SECS_IN_MIN = 60;
    var SECS_IN_HOUR = 3600;
    var SECS_IN_DAY = 86400;
    var SECS_IN_WEEK = SECS_IN_DAY * 7;
    var SECS_IN_TWO_MINS = SECS_IN_MIN * 2;
    var SECS_IN_TWO_HOURS = SECS_IN_HOUR * 2;
    var SECS_IN_TWO_DAYS = SECS_IN_DAY * 2;

    var curDate = new Date();
    var timeDiff = curDate.getTime()/1000 - time.getTime()/1000;
    var dayDiff = Math.floor(timeDiff / SECS_IN_DAY);
    var fuzzyStr;
    if (timeDiff < SECS_IN_MIN) {
        fuzzyStr = "just now";
    } else if (timeDiff < SECS_IN_TWO_MINS) {
        fuzzyStr = "1 min ago";
    } else if (timeDiff < SECS_IN_HOUR) {
        fuzzyStr = Math.floor(timeDiff / SECS_IN_MIN) + " mins ago";
    } else if (timeDiff < SECS_IN_TWO_HOURS) {
        fuzzyStr = "1 hour ago";
    } else if (timeDiff < SECS_IN_DAY) {
        fuzzyStr = Math.floor(timeDiff / SECS_IN_HOUR) + " hours ago";
    } else if (timeDiff < SECS_IN_TWO_DAYS) {
        fuzzyStr = "Yesterday";
    } else if (timeDiff < SECS_IN_WEEK) {
        fuzzyStr = Math.floor(timeDiff / SECS_IN_DAY) + " days ago";
    } else {
        fuzzyStr = time.toDateString();
    }
    return fuzzyStr;
}



//$.get(chrome.extension.getURL('/comment.mustache'), function(data) {
//    $(data).appendTo('body');
//});

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
        highlightsOnPage = items[url] || [];
        for (var i=0; i < highlightsOnPage.length; ++i) {
            restoreAttempts[highlightsOnPage[i]] = 0;
        }
        restore(highlightsOnPage);
    });
}

function restore(sels) {
    failedRestorations = [];
    for (var i = 0; i < sels.length; ++i) {
        var currSel = sels[i];
        if (restoreAttempts[currSel] === MAX_RESTORE_ATTEMPTS) {
            // current highlight corrupted.
            // todo: inform user
            deleteHighlightFromStorage(currSel);
            continue;
        }

        restoreAttempts[currSel]++;

        try {
            var sel = rangy.deserializeSelection(currSel);
            masha.highlightSelection(sel);
        } catch (err) {
            console.log(err);
            failedRestorations.push(currSel);
        }
    }

    if (failedRestorations.length > 0) {
        //Try again after a short while. Some elements might not have loaded
        setTimeout(function() {
            restore(failedRestorations);
        }, RESTORE_BUFFER_INTERVAL);
    }
}

function deleteHighlightFromStorage(sel) {
    var index = highlightsOnPage.indexOf(sel);
    if (index > -1) {
        highlightsOnPage.splice(index, 1);
    }
    storeHighlights(highlightsOnPage);
}


function highlight(sel) {
    var serializedSel = masha.highlightSelection(sel);
    highlightsOnPage.push(serializedSel);
}

function highlightIfNeeded(e) {
    var sel = rangy.getSelection();
    if (e.target.nodeName == 'INPUT' || e.target.nodeName == 'TEXTAREA') { return; }
    if (isDebounceFail()) { return;}

    StorageArea.get(STORAGE_HIGHLIGHT_MODE, function(items) {
        if (items[STORAGE_HIGHLIGHT_MODE]) {
            try {
                highlight(sel);
                storeHighlights(highlightsOnPage);
            } catch (err) {
                console.log(err);
            }
        }
    });
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

    $('#commentBtn').click(function() {
        var value = $('#commentForm').val();
        if ($.trim(value).length == 0) {
            return;
        }

        addComment("http://lorempixel.com/50/50/people/7",value, fuzzyDate(new Date()));
    });
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