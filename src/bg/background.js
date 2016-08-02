//console.log('background.js started!');
var isEnabled = false;
var counter = 0;
var _history = [];

function refreshBadge() {
    if (counter) {
        chrome.browserAction.setBadgeText({
            text: '' + counter
        });    
    } else {
        chrome.browserAction.setBadgeText({
            text: ""
        });        
    }
}

// Listener - Put this in the background script to listen to all the events.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // First, validate the message's structure
    if ((request.from === 'content') && (request.subject === 'console_action')) {
        var msg = "";
        for (var i = 0; i < request.msg.length; i++)
            if (typeof request.msg[i] == "object")
                msg += "Object " + JSON.stringify(request.msg[i]) + " ";
            else
                msg += request.msg[i] + " ";

        _history.push(request);
        if (request.action == 'warn') {
            chrome.notifications.create('', {
                type: "basic",
                title: "Warning!",
                message: msg,
                iconUrl: "icons/icon.png"
            }, function() {

            });
        } else if (request.action == 'alert') {
            chrome.notifications.create('', {
                type: "basic",
                title: "Alert!",
                message: msg,
                iconUrl: "icons/icon.png"
            }, function() {

            });
        } else {
            counter++;
            refreshBadge();
        }
        sendResponse({
            success: true
        });
    } else if ((request.from === 'background') && (request.subject === 'popupOpen')) {
        chrome.runtime.sendMessage({from: 'background', subject: 'popup_render', history: JSON.stringify(_history)}, function(response) {
            console.log('popup rendered!');
            counter = 0;
            refreshBadge();
        });
    }
});
