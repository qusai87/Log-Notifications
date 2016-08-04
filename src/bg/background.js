//console.log('background.js started!');
var isEnabled;
var counters = [];
var all_logs_history = [];
var commands_history = [];
var tabId = '0:0';

chrome.storage.sync.get('enabled', function (result) {
    if (typeof result.enabled === 'boolean') {
        isEnabled = result.enabled;
    }
    else {
        isEnabled =  true || localStorage.isEnabled;
        chrome.storage.sync.set({'enabled': isEnabled}, function() {
          console.log('enabled saved');
        });
    }
});

chrome.storage.sync.get('commandsHistory', function (result) {
    if (result.commandsHistory && result.commandsHistory.length) {
        for (var key in result.commandsHistory) {
            var value = result.commandsHistory[key];
            commands_history.push(value);
        }
    } else if (!result.commandsHistory) {
        chrome.storage.sync.set({'commandsHistory': []}, function() {
          console.log('commandsHistory saved');
        });
    }
});

function getUniqueArray(arr) {
    var seen = {};
    var out = [];
    var len = arr.length;
    var j = 0;
    for(var i = 0; i < len; i++) {
         var item = arr[i];
         if(seen[item] !== 1) {
               seen[item] = 1;
               out[j++] = item;
         }
    }
    return out;
}

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

        all_logs_history.push(request);
        if (all_logs_history.length> 300) {
            all_logs_history = all_logs_history.slice(Math.max(all_logs_history.length - 300, 1));
        }
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
          console.log('enabled saved');
        });
    } else if ((request.from === 'popup') && (request.subject === 'save_command_to_history')) {
        commands_history.push(request.command);
        if (commands_history> 100)
            commands_history = commands_history.slice(Math.max(commands_history.length - 100, 1));

        chrome.storage.sync.set({'commandsHistory': getUniqueArray(commands_history)});
    }
});

chrome.tabs.onActivated.addListener(function(tabInfo) {
    tabId = tabInfo.windowId  + ':' + tabInfo.tabId;
    if (!counters[tabId]) {
        counters[tabId] = 0;
    }
    counter = counters[tabId];
    refreshBadge();
});