// GLOBAL Variables
enabled = true;
notification_enabled = false;
all_sessions = false;

respone_not_received_timer = -1;
DEBUG = false;

if (DEBUG)
    console.log('popup.js opened!');

logs_history = null;

_gaq = [];
_gaq.push(['_setAccount', 'UA-82270161-1']);

_gaq.push(['_trackEvent','popup','opened']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

function init(logsHistoryJSON) {
	var logs;
	chrome.runtime.sendMessage({
		from: 'popup',
		subject: 'popup_opened'
	}, function(response) {});
	logs_history = JSON.parse(logsHistoryJSON);
	showLogs();
}

function loadLogs () {
	if (all_sessions) {
		// update console history from current active tab
		chrome.runtime.sendMessage({
			from: 'popup',
			subject: 'get_all_history'
		}, function(response) {});
    } else {
    	// update console history from current active tab
		chrome.tabs.query({
			active: true,
			currentWindow: true
		}, function(tabs) {
			// ...and send a request for the DOM info...
			chrome.tabs.sendMessage(tabs[0].id, {
				from: 'popup',
				subject: 'get_console_history'
			}, function(response) {});
		});
    }
}
function showNewLogs(logsHistoryJSON) {
	var _old_logs = logs_history;
	logs_history = JSON.parse(logsHistoryJSON);
	var text = controller.getPromptText();
	clear();
	showLogs();
	controller.promptText(text);
	chrome.runtime.sendMessage({
		from: 'popup',
		subject: 'popup_opened'
	}, function(response) {});
}

function getUniqueArray(arr) {
    var seen = {};
    var out = [];
    var len = arr.length;
    var j = 0;
    for(var i = 0; i < len; i++) {
         var item = arr[i];
         if(seen[item] !== 1) {
               seen[item] = 1;
               out.push(item);
         }
    }
    return out;
}

function loadCommandsHistory() {
	chrome.storage.sync.get('commandsHistory', function (result) {
		if (DEBUG)
			console.log('result.commandsHistory.length: ', result.commandsHistory.length)
	    if (result.commandsHistory && result.commandsHistory.length) {
	    	var uniqueHistory = getUniqueArray(result.commandsHistory);
	    	for (var key in uniqueHistory) {
            	var value = uniqueHistory[key];
				controller.addToHistory(value);
			}
	    }
	});
}

function clearCommandsHistory() {
	controller.clearHistory();
	chrome.runtime.sendMessage({
		from: 'popup',
		subject: 'clear_history',
	}, function(response) {});
}

function addToHistory(command) {
	if (command) {
		if (controller) {
			controller.addToHistory(command);
		}
		chrome.runtime.sendMessage({
			from: 'popup',
			subject: 'save_command_to_history',
			command: command
		}, function(response) {});
	}
}
function evaluateJSExpression(_expression) {
	respone_not_received_timer = setTimeout(function () {
		controller.commandResult('can\'t access page!','jquery-console-message-error');
	},1000);
	// ...query for the active tab...
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function(tabs) {
		// ...and send a request for the DOM info...
		chrome.tabs.sendMessage(tabs[0].id, {
			from: 'popup',
			subject: 'evaluate_js_expression',
			expression: _expression
		}, function() {});
	});
}


function reduce(arr,filters) {
	var results =[];
	if (!arr) {
		return null;
	}
	var count = 1;

	for (var i=0;i<arr.length;i++) {
		arr[i].count = 1;
	}
	for (var i=0;i<arr.length;i++) {
		if (filters) {
			var msg = arr[i].msg;
			if (typeof arr[i].msg === 'object') {
				msg = arr[i].msg.join('');
			}
			if (msg.indexOf(filters) === -1)
				continue;
		}
		if (_.isEqual(arr[i+1],arr[i])) {
			count++;
			if (i<arr.length) {
				continue;
			}
		}
		if (count>1) {
			results.push(_.extend(arr[i],{count: count}));
		} else {
			results.push(arr[i]);
		}
		count = 1;
	}
	return results;
}
function clear() {
	if (controller)
		controller.clearScreen();
}
function showLogs() {
	var logs = [];
	var filters = $('#filters').val();
	var logs_history_filtered = reduce(logs_history,filters);
	for (var key in logs_history_filtered) {
		var value = logs_history_filtered[key];
		if (value.action) {
			if (value.msg && value.msg.length === 1) {
				logs.push({
					msg: value.msg,
					count: value.count,
					className: "jquery-console-message-"+value.action
				});
			} else {
				logs.push({
					msg: value.msg,
					className: "jquery-console-message-"+value.action
				});
			}
		}
	}
	if (controller) {
		if (logs.length) {
			controller.commandResult(logs);
		} else {
			controller.commandResult('');
		}
		controller.focus();
	}
}

function onSwitchClicked ( event)
{
    var checked = $(event.currentTarget).parent().hasClass('switchable-checked');
    var id = $(event.currentTarget).closest('.switchable-wrapper').prev().get(0).id;

    if (id === 'notificationSwitch') {
    	notification_enabled = checked;
    	chrome.runtime.sendMessage({
			from: 'popup',
			subject: 'disable_notifications',
			enabled: checked
		}, function(response) {
		});
    } else if (id === 'enabledSwitch') {
    	enabled = checked; 
    	chrome.runtime.sendMessage({
			from: 'popup',
			subject: 'disable_extension',
			enabled: checked
		}, function(response) {
		});
    } else if (id === 'allSessions') {
    	all_sessions = checked;
    	clear();
    	loadLogs();

    	chrome.storage.sync.set({'all_sessions': all_sessions}, function() {
          console.log('all_sessions saved');
        });
    }
}

// Once the DOM is ready...
window.addEventListener('DOMContentLoaded', function() {
	$(function () {
		chrome.storage.sync.get('enabled', function(result) {
			enabled = result.enabled;
			if (enabled) {
				$('#enabledSwitch').prop('checked','checked');
			}
			$('#filters').on('change',function () {
				if ($('#filters').data('oldVal') != $('#filters').val()) {
					_gaq.push(['_trackEvent',$('#filters').val(),'filter']);
					$('#filters').data('oldVal', $('#filters').val());
					chrome.storage.sync.set({
						'filters': $('#filters').val()
					}, function() {
						console.log('filters saved');
					});
					clear();
					showLogs();
				}
			});

			$('#enabledSwitch').val(enabled?'checked':'');
			$('#enabledSwitch').switchable({
	            click: onSwitchClicked
	        });
			chrome.storage.sync.get('filters', function(result) {
				$('#filters').val(result.filters);
				$('#filters').data('oldVal', $('#filters').val());
			});

			controller = $('.console').empty().console({
				promptLabel: '> ',
				commandValidate: function(line) {
					if (DEBUG)
						console.log('validate',line);
					if (line === 'clear' || line === 'clear()') {
						_gaq.push(['_trackEvent',line,'command']);
						addToHistory(line);
						evaluateJSExpression('console.__data__.history = []');
						clear();
					} else if (line === 'clearHistory' || line === 'clearHistory()') {
						_gaq.push(['_trackEvent',line,'command']);
						addToHistory(line);
						controller.commandResult('');
						clearCommandsHistory();
					} else if (line === 'logs' || line === 'logs()') {
						_gaq.push(['_trackEvent',line,'command']);
						addToHistory(line);
						showLogs();
					} else if (line === 'cookie') {
						_gaq.push(['_trackEvent',line,'command']);
						addToHistory(line);
						evaluateJSExpression('console.__data__.cookie()');
					} else if (line.indexOf('cookie(') === 0) {
						addToHistory(line);
						evaluateJSExpression('console.__data__.' + line);
					} else if (line) {
						_gaq.push(['_trackEvent',line,'expression']);
						addToHistory(line);
						evaluateJSExpression(line);
					} else {
						controller.commandResult('');
					}
					return false; // disable it for now
				},
				commandHandle: function(line) {
					try {
						var ret = eval(line);
						if (typeof ret != 'undefined') return ret.toString();
						else return true;
					} catch (e) {
						return e.toString();
					}
				},
				animateScroll: true,
				promptHistory: true,
				welcomeMessage: 'current console logs:'
			});
			loadCommandsHistory();
			$("#filters").blur(); 
			controller.focus();
			setTimeout(function () {
				controller.focus();
			},250);
	        
		});

		chrome.storage.sync.get('notification_enabled', function(result) {
			notification_enabled = result.notification_enabled;
			if (notification_enabled) {
				$('#notificationSwitch').prop('checked','checked');
			}
			$('#notificationSwitch').val((notification_enabled)?'checked':'');
			$('#notificationSwitch').switchable();
		});

		chrome.storage.sync.get('all_sessions', function(result) {
			all_sessions = result.all_sessions;
			if (all_sessions) {
				$('#allSessions').prop('checked','checked');
			}
			$('#allSessions').val((all_sessions && enabled)?'checked':'');
			$('#allSessions').switchable();

			loadLogs();
		});
	});
});

// Listen for messages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	// If the received message has the expected format...
	if (request.from === 'content' && request.subject === 'console_action') {
		chrome.tabs.query({
			active: true,
			currentWindow: true
		}, function(tabs) {
			if (sender.tab.id === tabs[0].id) {
				chrome.tabs.sendMessage(tabs[0].id, {
					from: 'popup',
					subject: 'get_console_history'
				}, function(response) {});
			}
		});
	}
	else if (request.from === 'content' && request.subject === 'logs_history_found') {
		if (!logs_history) {
			init(request.logsHistoryJSON);
		}
		else {
			showNewLogs(request.logsHistoryJSON);
		}
	} else if (request.from === 'background' && request.subject === 'all_history') {
		if (!logs_history) {
			init(request.logsHistoryJSON);
		}
		else {
			showNewLogs(request.logsHistoryJSON);
		}
	} else if (request.from === 'content' && request.subject === 'expression_found') {
		clearTimeout(respone_not_received_timer);
		respone_not_received_timer = -1;
		var data = JSON.parse(request.output);

		if (typeof data==='string' && (data.indexOf('*ReferenceError') === 0)) {
			controller.commandResult(data,'jquery-console-message-error');
		} else if (typeof data==='string' && (data.indexOf('*SyntaxError') === 0)) {
			controller.commandResult(data,'jquery-console-message-error');
		} else if (typeof data==='string' && (data.indexOf('*TypeError') === 0)) {
			controller.commandResult(data,'jquery-console-message-error');
		} else {
			controller.commandResult(data,'jquery-console-message-value');
		}
	}
});