/**
 * Chronote - google-docs-like editing on web pages
 * https://github.com/seowyanyi/Chronote
 *
 * Copyright 2015, Seow Yan Yi
 * Licensed under the MIT license.
 */
'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
    console.log('previousVersion', details.previousVersion);
});

chrome.browserAction.setBadgeText({text: '\'Allo'});

console.log('\'Allo \'Allo! Event Page for Browser Action');

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ?
        "from a content script:" + sender.tab.url :
            "from the extension");
        //if (request.getCurrentUrl) {
        //    sendResponse({currentUrl: sender.tab.url});
        //}
    });

chrome.commands.onCommand.addListener(function(command) {
    if (command === "toggleMode") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {action: "toggleMode"}, function(response) {});
        });
    }
});