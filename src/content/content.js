// Stackoverflow : http://stackoverflow.com/questions/9515704/building-a-chrome-extension-inject-code-in-a-page-using-a-content-script/9517879#9517879

var s = document.createElement('script');
// TODO: add "script.js" to web_accessible_resources in manifest.json
s.src = chrome.extension.getURL('src/inject/inject.js');
s.onload = function() {
    this.parentNode.removeChild(this);
};
(document.head||document.documentElement).appendChild(s);

// Stackoverflow : http://stackoverflow.com/questions/9602022/chrome-extension-retrieving-gmails-original-message
// 
// Event listener

document.addEventListener('Msg_LogNotificationExtension', function(e) {
	if (e && e.detail && e.detail.messages && e.detail.messages.length) {
		var msg = e.detail.messages[0].msg;
		var action = e.detail.messages[0].action;
		chrome.runtime.sendMessage({msg: msg,action:action}, function(response) {

		});
 	}
});

