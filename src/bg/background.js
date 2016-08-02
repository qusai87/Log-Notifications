var isEnabled = true || localStorage.isEnabled;
chrome.storage.sync.set({'enabled': isEnabled}, function() {
  console.log('Settings saved');
});

//console.log('background.js started!');
var counters = [];
var _history = [];
var tabId = 0;
function refreshBadge() {
    if (!isEnabled) {
        chrome.browserAction.setBadgeText({
            text: 'off'
        });    
    }
    else if (counters[tabId]) {
        chrome.browserAction.setBadgeText({
            text: '' + counters[tabId]
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
        if (!isEnabled)
            return;
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
            if (!counters[tabId]) {
                counters[tabId] = 0;
            }

            counters[tabId]++;
            refreshBadge();
        }
        sendResponse({
            success: true
        });
    } else if ((request.from === 'popup') && (request.subject === 'popup_opened')) {
        counters[tabId] = 0;
        refreshBadge();
        sendResponse({
            success: true
        });
    } else if ((request.from === 'popup') && (request.subject === 'disable_notification')) {
        isEnabled = request.enabled;
        refreshBadge();

        chrome.storage.sync.set({'enabled': isEnabled}, function() {
          console.log('Settings saved');
        });
    }
});

chrome.tabs.onActivated.addListener(function(tabInfo) {
    console.log(tabInfo);
    tabId = tabInfo.tabId;
    if (!counters[tabId]) {
        counters[tabId] = 0;
    }
    counter = counters[tabId];
    refreshBadge();
});