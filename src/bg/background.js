//console.log('background.js started!');
var isEnabled,isNotificationEnabled;

var counters = [];
var all_logs_history = [];
var commands_history = [];
var activeTabId = '0:0';

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
    refreshBadge();
});

chrome.storage.sync.get('notification_enabled', function (result) {
    if (typeof result.enabled === 'boolean') {
        isNotificationEnabled = result.enabled;
    }
    else {
        isNotificationEnabled =  true || localStorage.isNotificationEnabled;
        chrome.storage.sync.set({'notification_enabled': isNotificationEnabled}, function() {
          console.log('notification_enabled saved');
        });
    }
    refreshBadge();
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

function unique(arr) {
      var results = [];
      for ( i = 0; i < arr.length; i++ ) {
          var current = arr[i];
          if (arr.lastIndexOf(current) === i) 
            results.push(current);
      }
      return results;
    }

function refreshBadge() {
    if (!isEnabled) {
        chrome.browserAction.setBadgeText({
            text: 'off'
        });    
    } else if (!isNotificationEnabled) {
        chrome.browserAction.setBadgeText({
            text: 'muted'
        });    
    }
    else if (counters[activeTabId]) {
        chrome.browserAction.setBadgeText({
            text: '' + counters[activeTabId]
        });    
    } else {
        chrome.browserAction.setBadgeText({
            text: ""
        });        
    }
}

// Listener - Put this in the background script to listen to all the events.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var tabId;
    if (sender && sender.tab) {
        tabId = sender.tab.windowId + ':' + sender.tab.id;
    } else {
        tabId = activeTabId;
    }
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
        if (isNotificationEnabled) {
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
        }
        sendResponse({
            success: true
        });
    } else if ((request.from === 'popup') && (request.subject === 'popup_opened')) {
        activeTabId = tabId;
        counters[tabId] = 0;
        refreshBadge();
        sendResponse({
            success: true
        });
    } else if ((request.from === 'popup') && (request.subject === 'disable_extension')) {
        isEnabled = request.enabled;
        refreshBadge();

        chrome.storage.sync.set({'enabled': isEnabled}, function() {
          console.log('enabled saved');
        });
    } else if ((request.from === 'popup') && (request.subject === 'disable_notifications')) {
        isNotificationEnabled = request.enabled;
        refreshBadge();

        chrome.storage.sync.set({'notification_enabled': isNotificationEnabled}, function() {
          console.log('notification_enabled saved');
        });
    } else if ((request.from === 'popup') && (request.subject === 'save_command_to_history')) {
        commands_history.push(request.command);
        if (commands_history> 100)
            commands_history = commands_history.slice(Math.max(commands_history.length - 100, 1));
        chrome.storage.sync.set({'commandsHistory': unique(commands_history)});
    } else if ((request.from === 'popup') && (request.subject === 'clear_history')) {
        commands_history = [];
        chrome.storage.sync.set({'commandsHistory': commands_history});
    }
});

chrome.tabs.onActivated.addListener(function(tabInfo) {
    console.log('tab opened!',tabInfo);
    if (tabInfo) {
        var tabId = tabInfo.windowId  + ':' + tabInfo.tabId;
        activeTabId  = tabId;
        if (!counters[tabId]) {
            counters[tabId] = 0;
        }
        counter = counters[tabId];
        refreshBadge();
    }
});