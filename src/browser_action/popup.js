var expression;
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
	
	logs = [];
	$.each(_history, function(index, value) {
		if (value.action) {
			logs.push({
				msg: value.msg,
				className: "jquery-console-message-success"
			});
		}
	});
	
	if (logs.length) {
		controller.commandResult(logs);
	}
}

// Once the DOM is ready...
window.addEventListener('DOMContentLoaded', function() {
	$(function () {
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

        controller = $('.console').empty().console({
			promptLabel: '> ',
			commandValidate: function(line) {
				if (line === 'clear' || line === 'clear()') {
					controller.addToHistory(line);
					controller.clearScreen();
				} else if (line === 'logs' || line === 'logs()') {
					controller.addToHistory(line);
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
		controller.addToHistory(expression);
		controller.commandResult(JSON.stringify(data, null, 4));
	}
});