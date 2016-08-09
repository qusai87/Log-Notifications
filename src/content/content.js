// Stackoverflow : http://stackoverflow.com/questions/9515704/building-a-chrome-extension-inject-code-in-a-page-using-a-content-script/9517879#9517879
// Read it from the storage
var DEBUG = false;
var console = window.console;
if (DEBUG)
	console.log('content.js started!');

chrome.storage.sync.get('enabled', function(result) {
	var enabled = result.enabled;
	chrome.storage.sync.get('notification_enabled', function(result2) {
		init(enabled,result2.notification_enabled);
	});
	
});
var injectedFiles = [];
function injectFile(src) {
	if (injectedFiles.indexOf(src) === -1) {
		injectedFiles.push(src);
		var s = document.createElement('script');
		// TODO: add "script.js" to web_accessible_resources in manifest.json
		s.src = chrome.extension.getURL(src);
		s.onload = function() {
			this.parentNode.removeChild(this);
		};
		(document.head || document.documentElement).appendChild(s);
	}
}
function init(enabled,notificationEnabled) {
	if (enabled) {
		injectFile('src/inject/evaluate.js');
		
		document.addEventListener('Msg_LogNotificationExtension_js_expression_found', function(e) {
			if (DEBUG)
				console.log(e);
			if (e && e.detail) {
				chrome.runtime.sendMessage({
					from: 'content',
					subject: 'expression_found',
					output: e.detail
				}, function(response) {});
			}
		});

		if (notificationEnabled) {
			injectFile('src/inject/console.js');

			// Stackoverflow : http://stackoverflow.com/questions/9602022/chrome-extension-retrieving-gmails-original-message
			// Event listener

			document.addEventListener('Msg_LogNotificationExtension_found', function(e) {
				if (e && e.detail && e.detail.length) {
					var msg = e.detail[0].msg;
					var action = e.detail[0].action;
					chrome.runtime.sendMessage({
						from: 'content',
						subject: 'console_action',
						msg: msg,
						action: action
					}, function(response) {
						if (DEBUG)
							console.log(response);
						document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_received', {}));
					});
				}
			});

			document.addEventListener('Msg_LogNotificationExtension_history_found', function(e) {
				if (e && e.detail) {
					chrome.runtime.sendMessage({
						from: 'content',
						subject: 'logs_history_found',
						logsHistoryJSON: e.detail
					}, function(response) {
						if (DEBUG)
							console.log(response);
					});
				}
			});

		}
	}
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, response) {
	// First, validate the message's structure
	if (DEBUG)
		console.log(request);

	if ((request.from === 'popup') && (request.subject === 'get_console_history')) {
		document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_get_history', {}));
	} 
	else if ((request.from === 'popup') && (request.subject === 'evaluate_js_expression')) {
		document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_evaluate_js_expression', {
			detail: request.expression
		}));
	}   
	else if ((request.from === 'popup') && (request.subject === 'init')) {
		if (DEBUG) {
			console.log('init')
		}
		init(request.enabled,request.notification_enabled);
	}   
});

