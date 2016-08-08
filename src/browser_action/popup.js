// GLOBAL Variables
logs = [];
respone_not_received_timer = -1;
expression = '';
enabled = false;
notification_enabled = false;
DEBUG = false;

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
	expression = _expression;
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

function reinit() {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			from: 'popup',
			subject: 'init',
			enabled: enabled,
			notification_enabled : notification_enabled
		}, function(response) {});
	});
}
function init(logsHistoryJSON) {
	chrome.runtime.sendMessage({
		from: 'popup',
		subject: 'popup_opened'
	}, function(response) {});
	var logs_history = JSON.parse(logsHistoryJSON);
	
	for (var key in logs_history) {
		var value = logs_history[key];
		if (value.action) {
			if (value.msg && value.msg.length === 1) {
				logs.push({
					msg: value.msg[0],
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
	
	if (logs.length) {
		controller.commandResult(logs);
	} else {
		controller.commandResult('');
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
			$('#enabledSwitch').val(enabled?'checked':'');
			$('#enabledSwitch').switchable({
	            click: function( event)
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
							reinit();
						});
	                } else {
	                	enabled = checked; 
	                	chrome.runtime.sendMessage({
							from: 'popup',
							subject: 'disable_extension',
							enabled: checked
						}, function(response) {
							reinit();
						});
	                }
	                
	                
	            }
	        });

	        chrome.storage.sync.get('notification_enabled', function(result) {
				notification_enabled = result.notification_enabled;
				if (notification_enabled && enabled) {
					$('#notificationSwitch').prop('checked','checked');
				}
				$('#notificationSwitch').val((notification_enabled && enabled)?'checked':'');
				$('#notificationSwitch').switchable();
			});
		});
		

        controller = $('.console').empty().console({
			promptLabel: '> ',
			commandValidate: function(line) {
				if (DEBUG)
					console.log('validate',line);
				if (line === 'clear' || line === 'clear()') {
					addToHistory(line);
					controller.clearScreen();
					expression = '';
				} else if (line === 'clearHistory' || line === 'clearHistory()') {
					addToHistory(line);
					controller.commandResult('');
					clearCommandsHistory();
				} else if (line === 'logs' || line === 'logs()') {
					addToHistory(line);
					controller.commandResult(logs);
					expression = '';
				} else if (line === 'cookie') {
					addToHistory(line);
					evaluateJSExpression('console.__data__.cookie()');
					expression = '';
				} else if (line.indexOf('cookie(') === 0) {
					addToHistory(line);
					evaluateJSExpression('console.__data__.' + line);
					expression = '';
				} else if (line.indexOf('$') === 0) {
					addToHistory(line);
					evaluateJSExpression('console.__data__.'+line);
					expression = '';
				} else if (line) {
					evaluateJSExpression(line);
					expression = '';
				} else {
					controller.commandResult('');
					expression = '';
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

	});
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
});

// Listen for messages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	// If the received message has the expected format...
	if (request.from === 'content' && request.subject === 'logs_history_found') {
		init(request.logsHistoryJSON);
	} else if (request.from === 'content' && request.subject === 'expression_found') {
		clearTimeout(respone_not_received_timer);
		respone_not_received_timer = -1;
		var data = JSON.parse(request.output);
		addToHistory(expression);
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