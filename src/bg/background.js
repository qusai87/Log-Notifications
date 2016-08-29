var isEnabled = true;
var isNotificationEnabled = false;

var counters = [];
var all_logs_history = {};
var commands_history = [];
var domainNotifications = {
    localhost : true,
};
var activeCounterId = null;
var excludeFilterRegex = null;
var includeFilterRegex = null;

DEBUG = false;

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
        chrome.storage.sync.set({'notification_enabled': isNotificationEnabled}, function() {
          if (DEBUG)
            console.log('notification_enabled saved');
        });
    }
    refreshBadge();
});

chrome.storage.sync.get('domain_notifications', function (result) {
    if (typeof result.domain_notifications === 'object') {
        domainNotifications = result.domain_notifications;
    }
    else {
        chrome.storage.sync.set({'domain_notifications': domainNotifications}, function() {
          if (DEBUG)
            console.log('domainNotifications saved', domainNotifications);
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

updateFilters();

function unique(arr) {
    var results = [];
    for (i = 0; i < arr.length; i++) {
        var current = arr[i];
        if (arr.lastIndexOf(current) === i)
            results.push(current);
    }
    return results;
}

function updateCounter(msg,tabId,counterId) {
    if (counterId && msg) {
        if (!counters[counterId]) {
            counters[counterId] = 0;
        }
        var filterMessage = null;
        if  (typeof msg === 'string' ) {
            filterMessage = msg;
        } else if  (typeof msg === 'object' ) {
            if (msg.length) {
                filterMessage = msg.join(' ');
            }
            else {
                filterMessage = msg.toString();
            }
        }
        if (filterMessage) {
            if (!(excludeFilterRegex && filterMessage.match(excludeFilterRegex)) && (!includeFilterRegex || msg.match(includeFilterRegex)))
            {
                counters[counterId]++;
                refreshBadge(tabId,counterId);
            }
        } else {
            counters[counterId]++;
            refreshBadge(tabId,counterId);   
        }
    }
}
function refreshBadge(tabId,counterId) {
    // update badge text :
    if (isEnabled) {
        if (counterId && counters[counterId]) {
            chrome.browserAction.setBadgeText({
                text: '' + counters[counterId]
            });    
        } else {
            chrome.browserAction.setBadgeText({
                text: ""
            });        
        }
    }
    // update icon :
    chrome.tabs.query(
    {
        currentWindow: true,
        active: true
    },
    function (tab) {
        if (tab && tab.length) {
            tabId = tabId || tab[0].id;
            var parser = document.createElement('a');
            parser.href = tab[0].url;
            var domain = parser.hostname;

            if (tabId) {
                if (isEnabled) {
                    if (isNotificationEnabled || domainNotifications[domain]) {
                        setIcon('');
                    } else {
                        setIcon('muted');
                    }
                } else {
                    setIcon('disabled');
                }
            }
        } else {
            if (isEnabled) {
                setIcon('');
            } else {
                setIcon('disabled');
            }
        }
    });
}

function setIcon(type) {
    var iconPrefix = "icons/icon"+(type?'-'+type:'');
    chrome.browserAction.setIcon(
    {
        path: {
            "16" : iconPrefix+"-16.png",
            "19" : iconPrefix+"-19.png",
            "38" : iconPrefix+"-38.png",
            "48" : iconPrefix+"-48.png",
            "128": iconPrefix+"-128.png"
        }
    });
}
// Listener - Put this in the background script to listen to all the events.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var counterId;
    if (sender && sender.tab) {
        counterId = sender.tab.windowId + ':' + sender.tab.id;
    } else {
        counterId = activeCounterId;
    }

    // First, validate the message's structure
    if ((request.from === 'content') && (request.subject === 'console_action')) {
        if (!isEnabled)
            return;
        var msg = "";

        if (typeof request.msg === 'object') {
            var checkStringObject = true;
            var stringArr = [];
            for (obj in request.msg) {
                if (typeof request.msg[obj] !== 'string') {
                    checkStringObject = false;
                    break;
                } else {
                    stringArr.push(request.msg[obj]);
                }
            }
            if (checkStringObject) {
                 msg = stringArr.join(' ');
            } else {
                msg = request.msg;
            }         
        } else if (typeof request.msg === 'string') {
            msg = request.msg;
        } else if (request.msg) {
            msg = '' + request.msg;
        }

        request.msg = msg;

        if (counterId) {
            if (!all_logs_history[counterId])
                all_logs_history[counterId] = [];

            all_logs_history[counterId].push(request);
            if (all_logs_history[counterId].length> 300) {
                all_logs_history[counterId] = all_logs_history[counterId].slice(Math.max(all_logs_history[counterId].length - 300, 1));
            }
        }
        if (request.action == 'error' || request.action == 'unknown') {
            if (isNotificationEnabled || domainNotifications[request.domain]) {
                chrome.notifications.create('', {
                    type: "basic",
                    title: "Error!",
                    message: msg,
                    iconUrl: "icons/icon-error.png"
                }, function() {});
            } else {
                updateCounter(msg,sender.tab.id,counterId);
            }
        } else if (request.action == 'warn') {
            if (isNotificationEnabled || domainNotifications[request.domain]) {
                chrome.notifications.create('', {
                    type: "basic",
                    title: "Warning!",
                    message: msg,
                    iconUrl: "icons/icon-warn.png"
                }, function() {});
            } else {
                updateCounter(msg,sender.tab.id,counterId);
            }
        } else if (request.action == 'alert') {
            if (isNotificationEnabled || domainNotifications[request.domain]) {
                chrome.notifications.create('', {
                    type: "basic",
                    title: "Alert!",
                    message: msg,
                    iconUrl: "icons/icon-info.png"
                }, function() {});
            } else {
                updateCounter(msg,sender.tab.id,counterId);
            }
        } else {
            updateCounter(msg,sender.tab.id,counterId);
        }

        sendResponse({
            success: true
        });
    } else if ((request.from === 'popup') && (request.subject === 'popup_opened')) {
        activeCounterId = counterId;
        counters[counterId] = 0;
        refreshBadge(request.tabId,counterId);
        sendResponse({
            success: true
        });
    } else if ((request.from === 'popup') && (request.subject === 'disable_extension')) {
        isEnabled = request.enabled;
        refreshBadge(request.tabId,counterId);

        chrome.storage.sync.set({'enabled': isEnabled}, function() {
          if (DEBUG)
            console.log('enabled saved');
        });
    } else if ((request.from === 'popup') && (request.subject === 'disable_notifications')) {
        isNotificationEnabled = request.enabled;
        refreshBadge(request.tabId,counterId);

        chrome.storage.sync.set({'notification_enabled': isNotificationEnabled}, function() {
          if (DEBUG)
            console.log('notification_enabled saved');
        });
    } else if ((request.from === 'popup') && (request.subject === 'modify_domain_Notifications')) {
        domainNotifications[request.domain] = request.enabled;
        refreshBadge(request.tabId,counterId);

        chrome.storage.sync.set({'domain_notifications': domainNotifications}, function() {
          if (DEBUG)
            console.log('domainNotifications saved', domainNotifications);
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
            logsHistoryJSON: counterId && JSON.stringify(all_logs_history[counterId])
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
        console.log('tab opened!',tabInfo.tabId);
    if (tabInfo) {
        var counterId = tabInfo.windowId  + ':' + tabInfo.tabId;
        activeCounterId = counterId;
        refreshBadge(tabInfo.tabId,counterId);
    }
});

chrome.tabs.onUpdated.addListener(function ( tabId, changeInfo, tabInfo) {
    if ( changeInfo.status === "complete" )
    {
        // page reload complete
        var counterId = tabInfo.windowId  + ':' + tabId;
        counters[counterId] = 0;
        if (DEBUG)
            console.log('page reloaded!',tabId);

        if (activeCounterId === counterId) {
            // only refresh badge if it's the active tab!
            refreshBadge(tabId, counterId);
        }

        // Extract url info
        var parser = document.createElement('a');
        parser.href = tabInfo.url;

        var domain = parser.hostname;

        if (domain && parser.protocol.indexOf('http')!==-1) {

            if (isNotificationEnabled || domainNotifications[domain]) {
                _gaq.push(['_trackEvent', domain, 'domain']);
            }
        }
    }
});


chrome.tabs.onCreated.addListener(function(tabInfo) {
    var counterId = tabInfo.windowId  + ':' + tabInfo.id;
    all_logs_history[counterId] = all_logs_history[counterId] || [];

    refreshBadge(tabInfo.id, counterId);

    if (DEBUG)
        console.log("Tab created event caught: " , tabId);

    // Extract url info
    var parser = document.createElement('a');
    parser.href = tabInfo.url;
    var domain = parser.hostname;

    if (domain && parser.protocol.indexOf('http')!==-1) {

        if (isNotificationEnabled || domainNotifications[domain]) {
            _gaq.push(['_trackEvent', domain, 'domain']);
        }
    }
});

chrome.tabs.onRemoved.addListener(function(tabId,tab) {
    var counterId = tab.windowId  + ':' + tabId;
    delete all_logs_history[counterId];

    if (activeCounterId === counterId) {
        activeCounterId = null;
        //refreshBadge(null,activeCounterId); # No Need to refresh the badge since there will be another tab activated!
    }


    if (DEBUG)
        console.log("Tab removed event caught: " , tabId);
});


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
