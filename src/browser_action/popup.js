// GLOBAL Variables
_history = '';
logs = [];
timer = -1;
expression = '';
commandHistory = [];
enabled = true;



function loadCommandsHistory() {
	chrome.storage.sync.get('commandsHistory', function (result) {
	    if (result.commandsHistory && result.commandsHistory.length) {
	    	for (var key in result.commandsHistory) {
            	var value = result.commandsHistory[key];
				controller.addToHistory(value);
			}
	    }
	});
}

function addToHistory(command) {
	if (command) {
		if (controller) {
			controller.addToHistory(command)
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
	// ...query for the active tab...
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function(tabs) {
		// ...and send a request for the DOM info...
		chrome.tabs.sendMessage(tabs[0].id, {
			from: 'popup',
			subject: 'evaluate_js_expression',
			expression: expression
		}, function(response) {});
	});
}

function init(historyJSON) {
	chrome.runtime.sendMessage({
		from: 'popup',
		subject: 'popup_opened'
	}, function(response) {});
	_history = JSON.parse(historyJSON);
	
	for (var key in _history) {
		var value = _history[key];
		if (value.action) {
			logs.push({
				msg: value.msg,
				className: "jquery-console-message-log"
			});
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
				$('#myswitch').prop('checked','checked');
			}
			$('#myswitch').val(enabled?'checked':'');
			debugger;
			$('#myswitch').switchable({
	            click: function( event)
	            {
	                var checked = $(event.currentTarget).parent().hasClass('switchable-checked');
	                chrome.runtime.sendMessage({
						from: 'popup',
						subject: 'disable_notification',
						enabled: checked
					}, function(response) {});
	            }
	        });
		});
		

        controller = $('.console').empty().console({
			promptLabel: '> ',
			commandValidate: function(line) {
				if (line === 'clear' || line === 'clear()') {
					addToHistory(line);
					controller.clearScreen();
				} else if (line === 'logs' || line === 'logs()') {
					addToHistory(line);
					controller.commandResult(logs);
				} else if (line) {
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
	if (request.from === 'content' && request.subject === 'history_found') {
		init(request.historyJSON);
	} else if (request.from === 'content' && request.subject === 'expression_found') {
		var data = JSON.parse(request.output);
		addToHistory(expression);
		controller.commandResult(JSON.stringify(data, null, 4),'jquery-console-message-value');
	}
});