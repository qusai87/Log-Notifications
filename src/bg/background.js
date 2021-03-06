import Preferences, { UserPreferencesKeys, USER_PREFERENCES_KEY} from '../modules/preferences.js';

//test notifications : 
// var count=0;var timer =setInterval(function () {count++;console.warn('bla bla bla');if (count===3) console.warn('after 3 times');if (count>15) clearTimeout(timer);},350)

var __DEBUG = false;

// Variables
var clearCacheRunning = false;
var activePageID = null;
var lastNotificatation;

var _domains = {};
var _pages = {};
var _logs = {};
var _commands = [];
var notifications = {};
var disabled_messages = [];

var notificationTimeout = -1;
var notificationCounter = 0;

var myNotificationID = null;

// chrome.webNavigation.onCommitted.addListener(function (data) {
//  // if (data && data.url && data.url.indexOf('http')!=-1)
//  //  chrome.tabs.executeScript( data.tabId, {file:"src/inject/disableIFRAME.js", frameId: data.frameId});
// });


Preferences.load(function (success) {
    refreshBadge();
});


chrome.storage.sync.get('commandsHistory', function (result) {
    if (result.commandsHistory && result.commandsHistory.length) {
        for (var key in result.commandsHistory) {
            var value = result.commandsHistory[key];
            _commands.push(value);
        }
    } else if (!result.commandsHistory) {
        chrome.storage.sync.set({'commandsHistory': []}, function() {
          if (__DEBUG)
            console.log('commandsHistory saved');
        });
    }
});

function showChromeNotification (notification) {
    if (!notification || !notification.message)
        return;

    if (!lastNotificatation) {
        notificationCounter = 0;
    }

    notificationCounter++; 

    if (!lastNotificatation  || _.isEqual(lastNotificatation , notification) ) {
        var currentNotification = notification;

        if (notificationTimeout !== -1) {
            clearTimeout(notificationTimeout);
            notificationTimeout = -1;
        }

        notificationTimeout = setTimeout(function () {
            console.log('show notification for last notification',currentNotification );
            createNotification(currentNotification, notificationCounter);
            notification = null;
            lastNotificatation = null;
        }, !lastNotificatation ? 100 : 1000);

        lastNotificatation = currentNotification;

    } else {
        var currentNotification = notification;
        setTimeout(function () {
            console.log('show notification for current notification',notification );
            createNotification(currentNotification, notificationCounter);
            notification = null;
            lastNotificatation = null;
        },  1500);
    }   
}

function createNotification (notification, messageCount) {
    if (!notification || !notification.message)
        return;

    if (__DEBUG) {
        console.log('notification created!', notification);
    }
    
    if (typeof notification.message === 'object') {
        if (notification.message.length) {
            notification.message = notification.message.join(' ');
        } else{
            notification.message = String(notification.message);
        }
    }
    if (messageCount > 1) {
        notification.message = '['+messageCount+'] ' + notification.message;
    }

    notification.buttons = [
        { title: 'Copy' },
        { title: 'Don\'t show again!' },
        { title: 'Close' }
    ];

    chrome.notifications.create('', notification ,  _.bind(function(id) {
        myNotificationID = id;
        if (this.context) {
            this.context.notifications[id] = this.message;
        }
    }, {
        message : notification.message , 
        context: this,
    }));

    notificationCounter = 0;
}

/* Respond to the user's clicking one of the buttons */
chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
    var log = getNotificationData(notifId);
    if (btnIdx === 0 && log) {
        copyToClipboard(log);
    } else if (btnIdx === 1 && log) {
        disableMessage(log);
    } 
    chrome.notifications.clear(notifId);
});

function getNotificationData(id) {
    return notifications[id];
}
function disableMessage (txt) {
    disabled_messages.push(txt);
}

function copyToClipboard (txt) {
    var input = document.createElement('textarea');
    document.body.appendChild(input);
    input.value = txt;
    input.focus();
    input.select();
    document.execCommand('Copy');
    input.remove();
}

function unique(arr) {
    var results = [];
    for (var i = 0; i < arr.length; i++) {
        var current = arr[i];
        if (arr.lastIndexOf(current) === i)
            results.push(current);
    }
    return results;
}

function getDomain (url) {
    // Extract url info
    var parser = document.createElement('a');
    parser.href = url;

    return parser.hostname;
}

function checkIsValidMessage (msg, action, domain) {
    var message = null;
    var isValid = false;

    if (action == 'error' && Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_ERRORS, domain)) {
        return false;
    }
    if (action == 'warn' && Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_WARNINGS, domain)) {
        return false;
    }
    if (action == 'info' && Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_INFO, domain)) {
        return false;
    }
    if (action == 'alert' && Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_INFO, domain)) {
        return false;
    }
    if (action == 'log' && Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_LOGS, domain)) {
        return false;
    }

    if  (typeof msg === 'string' ) {
        message = msg;
    } else if  (typeof msg === 'object' ) {
        if (msg.length) {
            message = msg.join(' ');
        }
        else {
            message = msg.toString();
        }
    }
    if (message) {
        var includeFilterRegex = Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.FILTERS_INCLUDED, domain);
        var excludeFilterRegex = Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.FILTERS_EXCLUDED, domain);
        isValid = !(excludeFilterRegex && message.match(excludeFilterRegex)) && (!includeFilterRegex || message.match(includeFilterRegex));
    }
    return isValid;
}

function isDisabledMessage (msg) {
    var message = null;
    var isDisabled = false;

    if  (typeof msg === 'string' ) {
        message = msg;
    } else if  (typeof msg === 'object' ) {
        if (msg.length) {
            message = msg.join(' ');
        }
        else {
            message = msg.toString();
        }
    }
    if (message) {
        if (disabled_messages.length) {
            for (var i = disabled_messages.length - 1; i >= 0; i--) {
                if (disabled_messages[i] == message) {
                    isDisabled = false;
                }
            }
        }
    }
    return isDisabled;
}

function updateNotificationCounter(tabId,pageId, domain) {
    if (__DEBUG)
        console.log('update notifications count: ',pageId);
    if (pageId && activePageID === pageId) {
        if (!_pages[pageId]) {
            _pages[pageId] = 0;
        }
        _pages[pageId]++;
        refreshBadge(tabId, pageId, domain);
    }
}
function refreshBadge(tabId, pageId, domain) {
    // update icon :
    pageId = pageId || activePageID;

    var count = _pages[pageId] || 0;
    var pageLogs = _logs[pageId];
    var hasErrors = false;

    if (pageLogs) {
        for (var i =0; i< pageLogs.length; i++) {
            if (pageLogs[i].action == 'error') {
                hasErrors = true;
            }
        }
    }

    if (Preferences.getPreference(UserPreferencesKeys.IS_ACTIVE)) {
        var canShowNotifications = Preferences.getPreference(UserPreferencesKeys.SHOW_NOTIFICATIONS);
        var canShowNotificationsInDomain = Preferences.getPreferenceForDomain(UserPreferencesKeys.SHOW_NOTIFICATIONS, domain);
        if (pageId && activePageID == pageId && (canShowNotifications || canShowNotificationsInDomain)) {
            enableIcon(count, hasErrors);
        }  else {
            count = 0;
            muteIcon(count);
        }
    }  else {
        count = 0;
        disableIcon(count);
    }
}
function updateBadgeCount(count) {
    if (count) {
        chrome.browserAction.setBadgeText({
            text: String(count)
        });
    } else {
        chrome.browserAction.setBadgeText({
            text: ''
        });
    }
}
function enableIcon(count, hasErrors) {
    if (!hasErrors) {
        setIcon('');
    } else {
        setIcon('error');
    }
    updateBadgeCount(count);
}

function muteIcon(count) {
    setIcon('muted');
    updateBadgeCount(count);
}

function disableIcon(count) {
    setIcon('disabled');
    updateBadgeCount(count);
}

function setIcon(type) {
    var iconPrefix = "../../icons/icon"+(type?'-'+type:'');
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
function countElements(arr) {
    if (!arr)
        return;

    var a = [], b = [], prev;

    arr.sort(dynamicSort('msg'));
    for ( var i = 0; i < arr.length; i++ ) {
        if ( !prev || (arr[i] && arr[i].msg !== prev.msg) ) {
            a.push(arr[i].msg);
            b.push(1);
        } else {
            b[b.length-1]++;
        }
        prev = arr[i];
    }

    return [a,b];
}

function compare(a,b) {
    return (a['msg'] < b['msg']) ? -1 : (a['msg'] > b['msg']) ? 1 : 0;
}

function countMessages(arr,msg) {
    if (!arr)
        return 0;

    var a = [], prev;
    var count = 0;

    for ( var i = 0; i < arr.length; i++ ) {
        if (arr[i] && msg === arr[i].msg)
            count++;
    }

    return count;
}

function clearCache() {
    if (!clearCacheRunning) {
        //if (chrome.experimental != undefined && chrome.experimental.clear != undefined) {
        if (typeof(chrome.browsingData) !== 'undefined') {
            clearCacheRunning = true;
            var millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
            var oneWeekAgo = (new Date()).getTime() - millisecondsPerWeek;
            
            //Chrome 19:
            chrome.browsingData.removeCache({
                  "since": oneWeekAgo
                }, function() {
                clearCacheRunning = false;
            });
        }
    }
};

// Listener - Put this in the background script to listen to all the events.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    try {
        if (__DEBUG) {
            console.log('[BACKGROUND::DEBUG] chrome.runtime.onMessage:', request , sender);
        }
        var pageId;
        if (sender && sender.tab) {
            pageId = sender.tab.windowId + ':' + sender.tab.id;
        } else {
            pageId = activePageID;
        }

        // First, validate the message's structure
        if ((request.from === 'content') && (request.subject === 'console_action')) {
            if (!Preferences.getPreference(UserPreferencesKeys.IS_ACTIVE) || !request.msg) {
                return true;
                // return Promise.resolve("Dummy response to keep the console quiet");  
            }
            var msg = request.msg;

            if (pageId) {
                //msg = '[' + pageId + ']' + request.msg;
                // var count = countMessages(_logs[pageId],msg);
                // if (count > 10) {
                //  return;
                // } else if (count == 10) {
                //  msg += '\nThis Message repeated many times and it will be disabled from notifications.';
                // }

                if (!_logs[pageId]) {
                    _logs[pageId] = [];
                }

                _logs[pageId].push(request);

                if (_logs[pageId].length > 300) {
                    _logs[pageId] = _logs[pageId].slice(Math.max(_logs[pageId].length - 300, 1));
                }
            }

            var canShowNotifications = Preferences.getPreference(UserPreferencesKeys.SHOW_NOTIFICATIONS);
            var canShowNotificationsInDomain = Preferences.getPreferenceForDomain(UserPreferencesKeys.SHOW_NOTIFICATIONS, request.domain);

            var isValidMessage = checkIsValidMessage(msg, request.action, request.domain);
            if (isValidMessage && (canShowNotifications || canShowNotificationsInDomain)) {
                if (request.action == 'error' || request.action == 'unknown') {
                    var canShowErrors = Preferences.getPreference(UserPreferencesKeys.SHOW_ERRORS);
                    if (canShowErrors && !isDisabledMessage(msg)) {
                        showChromeNotification({
                            type: "basic",
                            title: "Error!",
                            message: msg,
                            iconUrl: "icons/icon-error.png"
                        });
                    } else {
                        updateNotificationCounter(sender.tab.id,pageId,request.domain);
                    }
                } else if (request.action == 'warn') {
                    var canShowWarnings = Preferences.getPreference(UserPreferencesKeys.SHOW_WARNINGS);
                    if (canShowWarnings && !isDisabledMessage(msg)) {
                        showChromeNotification({
                            type: "basic",
                            title: "Warning!",
                            message: msg,
                            iconUrl: "icons/icon-warn.png"
                        });
                    } else {
                        updateNotificationCounter(sender.tab.id,pageId,request.domain);
                    }
                } else if (request.action == 'alert') {
                    var canShowAlerts = Preferences.getPreference(UserPreferencesKeys.SHOW_ALERTS);
                    if (canShowAlerts && !isDisabledMessage(msg)) {
                        showChromeNotification({
                            type: "basic",
                            title: "Alert!",
                            message: msg,
                            iconUrl: "icons/icon-info.png"
                        });
                    } else {
                        updateNotificationCounter(sender.tab.id,pageId,request.domain);
                    }

                } else if (request.action == 'info') {
                    var canShowInfo = Preferences.getPreference(UserPreferencesKeys.SHOW_INFO);
                    if (canShowInfo && !isDisabledMessage(msg)) {
                        showChromeNotification({
                            type: "basic",
                            title: "info!",
                            message: msg,
                            iconUrl: "icons/icon-info.png"
                        });
                    } else {
                        updateNotificationCounter(sender.tab.id,pageId,request.domain);
                    }
                } else if (request.action == '$log') {
                    showChromeNotification({
                        type: "basic",
                        title: "JSC Log!",
                        message: msg,
                        iconUrl: "icons/icon-log.png"
                    });
                } else {
                    updateNotificationCounter(sender.tab.id,pageId,request.domain);
                }
            } else if (isValidMessage) {
                updateNotificationCounter(sender.tab.id,pageId,request.domain);
            }

            sendResponse({
                success: true
            });
        } else if ((request.from === 'popup') && (request.subject === 'popup_opened')) {
            activePageID = pageId;
            _pages[pageId] = 0;
            refreshBadge(request.tabId,pageId,request.domain);
            sendResponse({
                success: true
            });
        } else if ((request.from === 'popup') && (request.subject === 'save_command')) {
            _commands.push(request.command);
            if (_commands> 100)
                _commands = _commands.slice(Math.max(_commands.length - 100, 1));
            chrome.storage.sync.set({'commandsHistory': unique(_commands)});
        } else if ((request.from === 'popup') && (request.subject === 'clear_logs')) {
            _commands = [];
            chrome.storage.sync.set({'commandsHistory': _commands});
        } else if ((request.from === 'popup') && (request.subject === 'get_preserved_logs')) {
            chrome.runtime.sendMessage({
                from: 'background',
                subject: 'preserved_logs',
                logsHistoryJSON: pageId && JSON.stringify(_logs[pageId])
            },  response => {
                if(chrome.runtime.lastError) {
                } else {
                    if (__DEBUG)
                        console.log('[BACKGROUND::DEBUG] send message', response);
                }
            });
        } else if ((request.from === 'popup') && (request.subject === 'sync_preferences')) {
            Preferences.load(function () {
                refreshBadge(request.tabId,pageId,request.domain);
            });
        }

    } catch (e) {
        if (__DEBUG)
            console.warn(e);
    } finally {
        // return Promise.resolve("Dummy response to keep the console quiet");  
    }
    return true;
});


/*chrome.browserAction.onClicked.addListener(function () {
    // it will not fire if there is popup
    console.log('opened!');
});*/

chrome.tabs.onActivated.addListener(function(tabInfo) {
    setTimeout(() => {
        if (__DEBUG)
            console.log('tab opened!',tabInfo.tabId);
        if (tabInfo) {
            var pageId = tabInfo.windowId  + ':' + tabInfo.tabId;
            activePageID = pageId;
            chrome.tabs.query({
                    currentWindow: true,
                    active: true
                }, function (tab) {
                    if (tab && tab.length) {
                        var domain = getDomain(tab[0].url);
                        refreshBadge(tabInfo.tabId,pageId, domain);
                    } else {
                        refreshBadge(tabInfo.tabId,pageId, null);
                    }
                }
            );
        }
    }, 250);
});

chrome.tabs.onUpdated.addListener(function ( tabId, changeInfo, tabInfo) {
    // page reload
    var pageId = tabInfo.windowId  + ':' + tabId;
    var domain = getDomain(tabInfo.url);
    if (__DEBUG)
        console.log('tab status:',changeInfo.status);

    if (changeInfo.status === "loading" ) {
        if (!activePageID) {
            activePageID = pageId;
        }
        if (activePageID) {
            var isLogsPreserved = Preferences.getPreference(UserPreferencesKeys.PRESERVE_LOGS);

            if (_domains[activePageID] != domain || !isLogsPreserved) {
                _pages[activePageID] = 0;
                _logs[activePageID] = [];
                _domains[activePageID] = domain;
            }
        }
        
        refreshBadge(tabId, pageId, domain);
        var isActive  = Preferences.getPreference(UserPreferencesKeys.IS_ACTIVE);
        var isCachDisabled  = Preferences.getPreference(UserPreferencesKeys.DISABLE_CACHE);
        if (isActive && isCachDisabled) {
             if (domain) {
                var canShowNotifications = Preferences.getPreference(UserPreferencesKeys.SHOW_NOTIFICATIONS);
                var canShowNotificationsInDomain = Preferences.getPreferenceForDomain(UserPreferencesKeys.SHOW_NOTIFICATIONS, domain);
                if (canShowNotifications || canShowNotificationsInDomain) {
                    clearCache();
                }
            }
        }
    } else if (changeInfo.status === "complete" )
    {
        if (__DEBUG)
            console.log('page reloaded!',tabId);
    }
});

chrome.tabs.onCreated.addListener(function(tabInfo) {
    var pageId = tabInfo.windowId  + ':' + tabInfo.id;
    _logs[pageId] = _logs[pageId] || [];

    var domain = getDomain(tabInfo.url);
    refreshBadge(tabInfo.tabId,pageId, domain);

    if (__DEBUG)
        console.log("Tab created event caught: " , tabInfo);

    if (domain) {
        var canShowNotifications = Preferences.getPreference(UserPreferencesKeys.SHOW_NOTIFICATIONS);
        var canShowNotificationsInDomain = Preferences.getPreferenceForDomain(UserPreferencesKeys.SHOW_NOTIFICATIONS, domain);
        if (canShowNotifications || canShowNotificationsInDomain) {
            _gaq.push(['_trackEvent', domain, 'domain']);
        }
    }
});

chrome.tabs.onRemoved.addListener(function(tabId,tab) {
    var pageId = tab.windowId  + ':' + tabId;
    delete _logs[pageId];

    if (activePageID === pageId) {
        activePageID = null;
        // No Need to refresh the badge since there will be another tab activated!
    }

    if (__DEBUG)
        console.log("Tab removed event caught: " , tabId);
});

if (__DEBUG)
    console.log('background.js started!');

var _gaq = [];
_gaq.push(['_setAccount', 'UA-82270161-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
