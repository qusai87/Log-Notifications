// Listen for messages
chrome.runtime.sendMessage({
	from: 'background',
	subject: 'popupOpen'
});
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	// If the received message has the expected format...
	if (msg.from === 'background' && msg.subject === 'popup_render') {
		var history = JSON.parse(msg.history);
		$(function() {
			var output = [];
			$.each(history, function(index, value) {
				if (value.action)
					output.push({
						msg: value.msg,
						className: "jquery-console-message-success"
					});
			});
			var controller = $('.console').console({
				promptLabel: '> ',
				commandValidate: function(line) {
					if (line == "") return false;
					else return true;
				},
				commandHandle: function(line) {
					return false;
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
			if (output.length)
				controller.commandResult(output);
		});


		sendResponse({
			success: true
		});
	}
});