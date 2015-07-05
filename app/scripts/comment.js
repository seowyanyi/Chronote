/**
 * Chronote - google-docs-like editing on web pages
 * https://github.com/seowyanyi/Chronote
 *
 * Copyright 2015, Seow Yan Yi
 * Licensed under the MIT license.
 */
var Mustache = require('mustache');
var $ = require('jquery');
require('./lib/pep');
module.exports.addComment = addComment;
module.exports.restoreComments = restoreComments;

/**
 * Given an object of the following format:
 * {image: imageUrl, text: commentMsg, date: dateOfMessage}
 * adds the comment to UI and saves it to storage
 */

function addComment(image, text, date) {
    var view = {
        image: image,
        text: text,
        date: date
    };
    $.get(chrome.extension.getURL('/html/comment.mustache'), function(commentTemplate) {
        $(".commentList").append(Mustache.render(commentTemplate, view));
    });

    //todo: save to storage
}

function restoreComments() {
    $.get(chrome.extension.getURL('/html/comment.mustache'), function(commentTemplate) {
        var renderedList = {};
        renderedList["comments"] = [];
        var view = {
            image: 'http://seowyanyi.org/images/profilepic.jpg',
            text: 'nima veniam, quis nostrum exercitationem ullam corp ',
            date: '28 Jun'
        };
        renderedList["comments"].push(Mustache.render(commentTemplate, view));
        $.get(chrome.extension.getURL('/html/commentBox.mustache'), function(commentBoxTemplate) {
            var rendered = Mustache.render(commentBoxTemplate, renderedList);
            $(rendered).appendTo('body');
            $('.commentBox').pep({
                cssEaseDuration: 600,
                velocityMultiplier: 1
            });
        });
    });
}