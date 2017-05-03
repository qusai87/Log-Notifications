//test notifications : var count=0;var timer =setInterval(function () {count++;console.warn('bla bla bla');if (count===3) console.warn('after 3 times');if (count>5) clearTimeout(timer);},350)

DEBUG = false;

// Switches
var isEnabled = true;
var isNotificationEnabled = false;
var domainNotifications = {
	localhost : true
};
var disableCache = false;
var disableWarnings = true;
var disableAlerts = true;
var disableErrors = false;

// Variables
var clearCacheRunning = false;
var activePageID = null;
var lastNotificatation;
var _pages = [];
var _logs = {};
var _commands = [];
var notifications = {};
var excludeFilterRegex = null;
var includeFilterRegex = null;
var notificationTimeout = -1;
var notificationCounter = 1;

chrome.webNavigation.onCommitted.addListener(function (data) {
	// if (data && data.url && data.url.indexOf('http')!=-1)
	// 	chrome.tabs.executeScript( data.tabId, {file:"src/inject/disableIFRAME.js", frameId: data.frameId});
});

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

chrome.storage.sync.get('disableCache', function (result) {
	if (typeof result.disableCache === 'boolean') {
		disableCache = result.disableCache;
	} else {
		chrome.storage.sync.set({'disableCache': disableCache}, function() {
			if (DEBUG)
				console.log('disableCache saved');
		});
	}
});

chrome.storage.sync.get('disableWarnings', function (result) {
	if (typeof result.disableWarnings === 'boolean') {
		disableWarnings = result.disableWarnings;
	} else {
		chrome.storage.sync.set({'disableWarnings': disableWarnings}, function() {
			if (DEBUG)
				console.log('disableWarnings saved');
		});
	}
});

chrome.storage.sync.get('disableErrors', function (result) {
	if (typeof result.disableErrors === 'boolean') {
		disableErrors = result.disableErrors;
	}
});

chrome.storage.sync.get('disableAlerts', function (result) {
	if (typeof result.disableAlerts === 'boolean') {
		disableAlerts = result.disableAlerts;
	} else {
		chrome.storage.sync.set({'disableAlerts': disableAlerts}, function() {
			if (DEBUG)
				console.log('disableAlerts saved');
		});
	}
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
			_commands.push(value);
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

function showChromeNotification (notificationData) {
	if (!notificationData)
		return;

	if (lastNotificatation) {
		if (_.isEqual(lastNotificatation,notificationData)) {
			if (notificationTimeout !== -1) {
				clearTimeout(notificationTimeout);       
				notificationCounter++; 
			}

			notificationTimeout = setTimeout(function () {
				if (notificationCounter > 1)
					lastNotificatation.title = '['+notificationCounter+'] ' + lastNotificatation.title ;
				
				createNotification(notificationData);
				notificationCounter = 1;
				lastNotificatation = null;
			},500);

		} else {
			createNotification(notificationData);
			notificationCounter = 1; 
		}
	} else {
		createNotification(notificationData);
		notificationCounter = 1;
	}

	lastNotificatation = notificationData;
}

function createNotification (notificationData) {
	if (DEBUG)
		console.log('notification created!', notificationData);
	
	if (typeof notificationData.message ==='object') {
		if (notificationData.message.length) {
			notificationData.message = notificationData.message.join(' ');
		} else{
			notificationData.message = String(notificationData.message);
		}
	}

	chrome.notifications.create('', notificationData ,  _.bind(function(id) {
		if (this.context)
			this.context.notifications[id] = this.message;
	},{message :notificationData.message , context: this}));
}

/* Respond to the user's clicking one of the buttons */
chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
	if (btnIdx === 0 && notifId) {
		var log = getNotificationData(notifId);
		if (log) {
			copyToClipboard(log);
			chrome.notifications.clear(notifId);
		}
	} else {
		chrome.notifications.clear(notifId);
	}
});

function getNotificationData(id) {
	return notifications[id];
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

function getDomain (url) {
	// Extract url info
	var parser = document.createElement('a');
	parser.href = url;

	return parser.hostname;
}

function isValidMessage (msg) {
	var message = null;
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
	if (message)
		return !(excludeFilterRegex && message.match(excludeFilterRegex)) && (!includeFilterRegex || message.match(includeFilterRegex));
	return false;
}

function updateNotificationCounter(tabId,pageId, domain) {
	if (DEBUG)
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

	if (pageId && activePageID == pageId) {
		if (isEnabled) {
			if (isNotificationEnabled || domainNotifications[domain]) {
				enableIcon();
			} else {
				count = 0;
				muteIcon();
			}
		} else {
			count = 0;
			disableIcon();
		}
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
}
function enableIcon() {
	setIcon('');
}

function muteIcon() {
	setIcon('muted');
}

function disableIcon() {
	setIcon('disabled');
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
	var pageId;
	if (sender && sender.tab) {
		pageId = sender.tab.windowId + ':' + sender.tab.id;
	} else {
		pageId = activePageID;
	}

	// First, validate the message's structure
	if ((request.from === 'content') && (request.subject === 'console_action')) {
		if (!isEnabled || !request.msg)
			return;
		var msg= request.msg;

		if (pageId) {
			var count = countMessages(_logs[pageId],msg);
			if (count>5) {
				return;
			} else if (count==5) {
				msg = 'This Message repeat many times and it will be disabled from notifications. \n' +request.msg;
			}

			if (!_logs[pageId])
				_logs[pageId] = [];

			_logs[pageId].push(request);
			if (_logs[pageId].length> 300) {
				_logs[pageId] = _logs[pageId].slice(Math.max(_logs[pageId].length - 300, 1));
			}
		}
		if (isValidMessage(msg) && (isNotificationEnabled || domainNotifications[request.domain])) {
			if (request.action == 'error' || request.action == 'unknown') {
				if (!disableErrors) {
					showChromeNotification({
						type: "basic",
						title: "Error!",
						message: msg,
						iconUrl: "icons/icon-error.png",
						buttons: [
							{ title: 'Copy' },
							{ title: 'Close' }
						]
					});
				} else {
					updateNotificationCounter(sender.tab.id,pageId,request.domain);
				}
			} else if (request.action == 'warn') {
				if (!disableWarnings) {
					showChromeNotification({
						type: "basic",
						title: "Warning!",
						message: msg,
						iconUrl: "icons/icon-warn.png",
						buttons: [
							{ title: 'Copy' },
							{ title: 'Close' }
						]
					});
				} else {
					updateNotificationCounter(sender.tab.id,pageId,request.domain);
				}
			} else if (request.action == 'alert') {
				if (!disableAlerts) {
					showChromeNotification({
						type: "basic",
						title: "Alert!",
						message: msg,
						iconUrl: "icons/icon-info.png",
						buttons: [
							{ title: 'Copy' },
							{ title: 'Close' }
						]
					});
				} else {
					updateNotificationCounter(sender.tab.id,pageId,request.domain);
				}

			} else if (request.action == 'info') {
				showChromeNotification({
					type: "basic",
					title: "info!",
					message: msg,
					iconUrl: "icons/icon-info.png",
					buttons: [
						{ title: 'Copy' },
						{ title: 'Close' }
					]
				});
			} else {
				updateNotificationCounter(sender.tab.id,pageId,request.domain);
			}
		} else if (isValidMessage(msg)) {
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
	} else if ((request.from === 'popup') && (request.subject === 'disable_extension')) {
		isEnabled = request.enabled;
		refreshBadge(request.tabId,pageId,request.domain);

		chrome.storage.sync.set({'enabled': isEnabled}, function() {
		  if (DEBUG)
			console.log('enabled saved');
		});
	} else if ((request.from === 'popup') && (request.subject === 'disable_notifications')) {
		isNotificationEnabled = request.enabled;
		refreshBadge(request.tabId,pageId,request.domain);
	} else if ((request.from === 'popup') && (request.subject === 'modify_domain_Notifications')) {
		domainNotifications[request.domain] = request.enabled;
		refreshBadge(request.tabId,pageId,request.domain);
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
		}, function(response) {
			if (DEBUG)
				console.log(response);
		});
	} else if ((request.from === 'popup') && (request.subject === 'update_filters')) {
		updateFilters();
	} else if ((request.from === 'popup') && (request.subject === 'disable_cache')) {
		disableCache = request.enabled;
	} else if ((request.from === 'popup') && (request.subject === 'disable_warnings')) {
		disableWarnings = request.enabled;
	}  else if ((request.from === 'popup') && (request.subject === 'disable_errors')) {
		disableErrors = request.enabled;
	}  else if ((request.from === 'popup') && (request.subject === 'disable_alerts')) {
		disableAlerts = request.enabled;
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
		var pageId = tabInfo.windowId  + ':' + tabInfo.tabId;
		activePageID = pageId;
		chrome.tabs.query({
				currentWindow: true,
				active: true
			}, function (tab) {
				if (tab && tab.length) {
					var domain = getDomain(tab[0].url);
					refreshBadge(tabInfo.tabId,pageId, domain);
				}
			}
		);
	}
});

chrome.tabs.onUpdated.addListener(function ( tabId, changeInfo, tabInfo) {
	// page reload
	var pageId = tabInfo.windowId  + ':' + tabId;
	var domain = getDomain(tabInfo.url);
	if (DEBUG)
		console.log('tab status:',changeInfo.status);

	if (changeInfo.status === "loading" ) {
		if (!activePageID) {
			activePageID = pageId;
		}
		if (activePageID)
			_pages[activePageID] = 0;
		
		refreshBadge(tabId, pageId,domain);
		if (isEnabled && disableCache) {
			 if (domain) {
				if (isNotificationEnabled || domainNotifications[domain]) {
					clearCache();
				}
			}
		}
	} else if (changeInfo.status === "complete" )
	{
		if (DEBUG)
			console.log('page reloaded!',tabId);
	}
});

chrome.tabs.onCreated.addListener(function(tabInfo) {
	var pageId = tabInfo.windowId  + ':' + tabInfo.id;
	_logs[pageId] = _logs[pageId] || [];

	var domain = getDomain(tabInfo.url);
	refreshBadge(tabInfo.tabId,pageId, domain);

	if (DEBUG)
		console.log("Tab created event caught: " , tabInfo);

	if (domain) {
		if (isNotificationEnabled || domainNotifications[domain]) {
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
