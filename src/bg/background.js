var isEnabled,isNotificationEnabled;

var counters = [];
var all_logs_history = {};
var commands_history = [];
var activeTabId = '0:0';
var excludeFilterRegex = null;
var includeFilterRegex = null;

DEBUG = false;

if (DEBUG)
    console.log('background.js started!');

var _gaq = [];
_gaq.push(['_setAccount', 'UA-82270161-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

chrome.storage.sync.get('enabled', function (result) {
    if (typeof result.enabled === 'boolean') {
        isEnabled = result.enabled;
    }
    else {
        isEnabled =  true || localStorage.isEnabled;
        chrome.storage.sync.set({'enabled': isEnabled}, function() {
          if (DEBUG)
            console.log('enabled saved');
        });
    }
    refreshBadge();
});

chrome.storage.sync.get('notification_enabled', function (result) {
    if (typeof result.notification_enabled === 'boolean') {
        isNotificationEnabled = result.notification_enabled;
    }
    else {
        isNotificationEnabled =  true || localStorage.isNotificationEnabled;
        chrome.storage.sync.set({'notification_enabled': isNotificationEnabled}, function() {
          if (DEBUG)
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
          if (DEBUG)
            console.log('commandsHistory saved');
        });
    }
});

function updateFilters () {
    chrome.storage.sync.get('include_filters', function(result) {
        if (result.include_filters)
            includeFilterRegex = new RegExp(result.include_filters, 'gi');
        else 
            includeFilterRegex = null;
    });

    chrome.storage.sync.get('exclude_filters', function(result) {
        if (result.exclude_filters)
            excludeFilterRegex = new RegExp(result.exclude_filters, 'gi');
        else 
            excludeFilterRegex = null;
    });
}

function unique(arr) {
    var results = [];
    for (i = 0; i < arr.length; i++) {
        var current = arr[i];
        if (arr.lastIndexOf(current) === i)
            results.push(current);
    }
    return results;
}

function refreshBadge() {
    if (!isEnabled) {
        // Also correct
        chrome.browserAction.setBadgeText({
            text: 'off'
        });
    } /*else if (!isNotificationEnabled) {
        chrome.browserAction.setBadgeText({
            text: 'muted'
        });    
    }*/
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

        if (tabId) {
            if (!all_logs_history[tabId])
                all_logs_history[tabId] = [];

            all_logs_history[tabId].push(request);
            if (all_logs_history[tabId].length> 300) {
                all_logs_history[tabId] = all_logs_history[tabId].slice(Math.max(all_logs_history[tabId].length - 300, 1));
            }
        }
        if (request.action == 'error') {
            if (isNotificationEnabled) {
                chrome.notifications.create('', {
                    type: "basic",
                    title: "Error!",
                    message: msg,
                    iconUrl: "icons/icon.png"
                }, function() {});
            } 
        } else if (request.action == 'alert') {
            if (isNotificationEnabled) {
                chrome.notifications.create('', {
                    type: "basic",
                    title: "Alert!",
                    message: msg,
                    iconUrl: "icons/icon.png"
                }, function() {});
            } 
        } else {
            if (!counters[tabId]) {
                counters[tabId] = 0;
            }
            if (!(excludeFilterRegex && msg.match(excludeFilterRegex).length) && (!includeFilterRegex || msg.match(includeFilterRegex)))
            {
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
          if (DEBUG)
            console.log('enabled saved');
        });
    } else if ((request.from === 'popup') && (request.subject === 'disable_notifications')) {
        isNotificationEnabled = request.enabled;
        refreshBadge();

        chrome.storage.sync.set({'notification_enabled': isNotificationEnabled}, function() {
          if (DEBUG)
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
    } else if ((request.from === 'popup') && (request.subject === 'get_all_history')) {
        chrome.runtime.sendMessage({
            from: 'background',
            subject: 'all_history',
            logsHistoryJSON: activeTabId && JSON.stringify(all_logs_history[activeTabId])
        }, function(response) {
            if (DEBUG)
                console.log(response);
        });
    }else if ((request.from === 'popup') && (request.subject === 'update_filters')) {
        updateFilters();
    }
});

/*chrome.browserAction.onClicked.addListener(function () {
    // it will not fire if there is popup
    console.log('opened!');
});*/

chrome.tabs.onActivated.addListener(function(tabInfo) {
    if (DEBUG)
        console.log('tab opened!',tabInfo);
    if (tabInfo) {
        var tabId = tabInfo.windowId  + ':' + tabInfo.tabId;
        activeTabId  = tabId;

        refreshBadge();
    }
});

chrome.tabs.onUpdated.addListener(function ( tabId, changeInfo, tabInfo) {
    if ( changeInfo.status === "complete" )
    {
        // page reload complete
        activeTabId = tabInfo.windowId  + ':' + tabId;
        if (DEBUG)
            console.log('page reloaded!');

        refreshBadge();

        // Extract url info
        var parser = document.createElement('a');
        parser.href = tabInfo.url;

        if (parser.hostname && parser.protocol.indexOf('http')!==-1) {
            if (DEBUG)
                console.log(parser.hostname);
            _gaq.push(['_trackEvent', parser.hostname, 'domain']);
        }
    }
});


chrome.tabs.onCreated.addListener(function(tabInfo) {
    var tabId = tabInfo.windowId  + ':' + tabInfo.id;
    all_logs_history[tabId] = all_logs_history[tabId] || [];
    if (DEBUG)
        console.log("Tab created event caught: " , tabId);

    // Extract url info
    var parser = document.createElement('a');
    parser.href = tabInfo.url;

    if (parser.hostname && parser.protocol.indexOf('http')!==-1) {
        if (DEBUG)
            console.log(parser.hostname);
        _gaq.push(['_trackEvent', parser.hostname, 'domain']);
    }
});

chrome.tabs.onRemoved.addListener(function(tabId,tab) {
    var tabId = tab.windowId  + ':' + tabId;
    delete all_logs_history[tabId]
    if (DEBUG)
        console.log("Tab removed event caught: " , tabId);
});