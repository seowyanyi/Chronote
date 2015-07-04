/**
 * Chronote - google-docs-like editing on web pages
 * https://github.com/seowyanyi/Chronote
 *
 * Copyright 2015, Seow Yan Yi
 * Licensed under the MIT license.
 */
module.exports.getFuzzyDate = getFuzzyDate;

function getFuzzyDate(time) {
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

