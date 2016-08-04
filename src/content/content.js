// Stackoverflow : http://stackoverflow.com/questions/9515704/building-a-chrome-extension-inject-code-in-a-page-using-a-content-script/9517879#9517879
//console.log('content.js started!');
// Read it from the storage
chrome.storage.sync.get('enabled', function(result) {
	if(result.enabled) {
		injectFilesToPage();
	}
});

function injectFilesToPage() {
	var s = document.createElement('script');
	// TODO: add "script.js" to web_accessible_resources in manifest.json
	s.src = chrome.extension.getURL('src/inject/inject.js');
	s.onload = function() {
		this.parentNode.removeChild(this);
	};
	(document.head || document.documentElement).appendChild(s);
}


// Stackoverflow : http://stackoverflow.com/questions/9602022/chrome-extension-retrieving-gmails-original-message
// 
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
			//console.log(response);
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
			//console.log(response);
		});
	}
});

document.addEventListener('Msg_LogNotificationExtension_js_expression_found', function(e) {
	if (e && e.detail) {
		chrome.runtime.sendMessage({
			from: 'content',
			subject: 'expression_found',
			output: e.detail
		}, function(response) {});
	}
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, response) {
	// First, validate the message's structure
	if ((request.from === 'popup') && (request.subject === 'get_console_history')) {
		document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_get_history', {}));
	} else if ((request.from === 'popup') && (request.subject === 'evaluate_js_expression')) {
		document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_evaluate_js_expression', {
			detail: request.expression
		}));
		
	}   
});
