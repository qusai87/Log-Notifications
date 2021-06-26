// GLOBAL Variables
var __DEBUG = false;

notification_enabled = false;
respone_not_received_timer = -1;

domain = '';

logs_history = null;
_switches = {};

loaded = false;
loading_counts = 0;
totalLoad = 10;

// Once the DOM is ready...
$(function() {
	$('body').on('click', 'a', function(){
		chrome.tabs.create({url: $(this).attr('href')});
		return false;
	});

	$(".js-menu-toggle").click(function(e) {
		e.preventDefault();
		$("#wrapper").toggleClass("toggled");
		return false;
	});

	$(".js-clear-console").click(function(e) {
		e.preventDefault();
		clear();
		evaluateJSExpression('$JSC.history = [];', function () {});
		setTimeout(function () {
			controller.focus();
		}, 100);
		return false;
	});

	$(".js-history").click(function(e) {
		e.preventDefault();
		loadLogs(true);
		setTimeout(function () {
			controller.focus();
		}, 100);
		return false;
	});

	// init bootstrap switch
	$("[name='bootstrap-switch']").bootstrapSwitch();

	$('#include_filters').on('change keyup', _.debounce(function () {
		if ($('#include_filters').data('oldVal') != $('#include_filters').val()) {
			_gaq.push(['_trackEvent',$('#include_filters').val(),'include filter']);
			$('#include_filters').data('oldVal', $('#include_filters').val());
			chrome.storage.sync.set({
				'include_filters': $('#include_filters').val()
			}, function() {
				if (__DEBUG)
					console.log('include_filters saved');
				chrome.runtime.sendMessage({
					from: 'popup',
					subject: 'update_filters'
				}, function(response) {});
			});
			showLogs();
		}
	},300,false));

	$('#exclude_filters').on('change keyup', _.debounce(function () {
		if ($('#exclude_filters').data('oldVal') != $('#exclude_filters').val()) {
			_gaq.push(['_trackEvent',$('#exclude_filters').val(),'exclude filter']);
			$('#exclude_filters').data('oldVal', $('#exclude_filters').val());
			chrome.storage.sync.set({
				'exclude_filters': $('#exclude_filters').val()
			}, function() {
				if (__DEBUG)
					console.log('exclude_filters saved');
				chrome.runtime.sendMessage({
					from: 'popup',
					subject: 'update_filters'
				}, function(response) {});
			});
			showLogs();
		}
	},300,false));

	$('input[name="bootstrap-switch"]').on('switchChange.bootstrapSwitch', function(event, state) {
		var id = this.id;
		var checked = this.checked;
		if (loaded)
			saveOption(id,checked);
	});

	$('.js-jquery-button').click(function(){
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			$.get("https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js", function(result) {
				_gaq.push(['_trackEvent','jquery','lib']);
				evaluateJSExpression(result+';$.fn.jquery');
				$('.js-jquery-button').prop('disabled', true);
			}, "text");
		});
	});

	$('.js-underscore-button').click(function(){
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			$.get("http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.2.1/underscore-min.js", function(result) {
				_gaq.push(['_trackEvent','underscore','lib']);
				evaluateJSExpression(result+';_ = window._ || require("underscore");_.VERSION');
				$('.js-underscore-button').prop('disabled', true);
			}, "text");
		});
	});
	$('.btn-toggle').click(function() {
		$(this).find('.btn').toggleClass('active');
		if ($(this).find('.btn-primary').size()>0) {
			$(this).find('.btn').toggleClass('btn-primary');
		}
		if ($(this).find('.btn-danger').size()>0) {
			$(this).find('.btn').toggleClass('btn-danger');
		}
		if ($(this).find('.btn-success').size()>0) {
			$(this).find('.btn').toggleClass('btn-success');
		}
		if ($(this).find('.btn-info').size()>0) {
			$(this).find('.btn').toggleClass('btn-info');
		}
		$(this).find('.btn').toggleClass('btn-default');
	});

	controller = $('.console').empty().console({
		// welcomeMessage: 'New: you can use `$JSC.log` to get log notifications only if the domain enabled!',
		promptLabel: '> ',
		commandValidate: function(line) {
			if (__DEBUG)
				console.log('validate command:',line);

			if (line === 'domains' || line === 'domains()') {
				_gaq.push(['_trackEvent',line,'command']);
				addToHistory(line);
				controller.commandResult(_switches.domain_notifications,'jquery-console-message-value');
			} else if (line === 'clear' || line === 'clear()') {
				_gaq.push(['_trackEvent',line,'command']);
				addToHistory(line);
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
				evaluateJSExpression('$JSC.cookie()');
			} else if (line.indexOf('cookie(') === 0) {
				addToHistory(line);
				evaluateJSExpression('$JSC.' + line);
			} else if (line) {
				_gaq.push(['_trackEvent',line,'expression']);
				addToHistory(line);
				evaluateJSExpression(line);
			} else {
				//controller.commandResult('');
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
		autofocus: true,
		animateScroll: true,
		promptHistory: true
	});
	loadCommandsHistory();
});

chrome.tabs.query(
	{ 
		active: true,
		currentWindow: true
	}, 
	function (tabs) {
		var parser = document.createElement('a');
		parser.href = tabs[0].url;
		domain = parser.hostname;
		loadOptions();
	}
);

function init(logsHistoryJSON) {
	var logs;
	sendRuntimeMessage({
		from: 'popup',
		subject: 'popup_opened'
	}, function(response) {});

	logs_history = JSON.parse(logsHistoryJSON);
	showLogs();

	$("#include_filters").removeAttr('disabled');
	$("#exclude_filters").removeAttr('disabled');
	setTimeout(function () {
		controller.focus();
	}, 100);
}

function loadCommandsHistory() {
	chrome.storage.sync.get('commandsHistory', function (result) {
		if (__DEBUG)
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

function loadLogs (loadAll) {
	if (_switches.preserveLogs) {
		// update console history from background history
		sendRuntimeMessage({
			from: 'popup',
			subject: 'get_preserved_logs'
		}, function(response) {});
	} else {
		// update console history from current active tab
		if (loadAll) {
			sendMessage({
				from: 'popup',
				subject: 'get_console_all_history'
			}, function(response) {});
		} else {
			sendMessage({
				from: 'popup',
				subject: 'get_console_history'
			}, function(response) {});
		}
	}
}

function showLogs() {
	var logs = [];

	if (logs_history) {
		var filters = $('#include_filters').val();
		var excludeFilters = $('#exclude_filters').val();
		var logs_history_with_filters = reduce(logs_history,filters,excludeFilters);
		for (var key in logs_history_with_filters.results) {
			var details = logs_history_with_filters.results[key];

			if (details.msg && details.action) {
				var msg = prettifyMessage(details);
				if (msg) {
					logs.push({
						msg: msg,
						count: details.count,
						className: "jquery-console-message-"+details.action
					});
				}
			}
		}
	}
	if (typeof controller =='object') {
		clear();
		if (logs.length) {
			if (logs_history_with_filters.excluded) {
				controller.commandResult(sprintf('Excluded %d logs \n', logs_history_with_filters.excluded), "jquery-console-message-system");
			} else {
				controller.commandResult(sprintf('%d logs found!\n', logs.length), "jquery-console-message-system");
			}
			controller.commandResult(logs);

		} else {
			if (logs_history_with_filters.excluded) {
				controller.commandResult(sprintf('Excluded %d logs, remove filters to show logs!', logs_history_with_filters.excluded), "jquery-console-message-system");
			} else {
				controller.commandResult('No Console logs received!');
			}
		}
	}
}

// function splitter(data) {
//     var i = 0;
//     var results = _.chain(data)
//     .map((x) => (x.match(/%/g) || []).length)
//     .filter((x) => x)
//     .map(function(x) {
//         var index = i;
//         i += x + 1;
//         return data.slice(index, index + x + 1)
//     })
//     .value();
//     results.push(data.slice(i));
//     return results;
// }

function prettifyMessage(details) {
	var message = details.msg;
	try {
		message = JSON.parse(message);
	} finally {
		if (details.url) {
			message = message + ' at ' + details.url + ':' + details.line + ":" + details.col;
		}
		return message;
	}

	// Fix MSG param depend of type!
	// if (_.isArray(message)) {
	// 	return message.join(' ');
	// }
	// if (typeof message === 'object') {
	// 	var checkStringObject = true;
	// 	var stringArr = [];
	// 	for (obj in message) {
	// 		if (typeof message[obj] !== 'string' && typeof message[obj] !== 'number') {
	// 			checkStringObject = false;
	// 			break;
	// 		} else {
	// 			stringArr.push(message[obj]);
	// 		}
	// 	}
	// 	if (checkStringObject) {
	// 		 message = sprintf.apply(this, message);
	// 	}      
	// } else if (typeof message !== 'undefined') {
	// 	message = String(message);
	// }

	// if (typeof message === 'string' && message.indexOf('%c') != -1) {
	// 	// Detect %c color cases
	// 	//var regex  = /%c(.+?)\s([a-z0-9\-]+?)\:([a-z0-9\-]+?)\;/g;
	// 	message = message.replace(/%c(\w+)\s(\w+:#.+;)+/g,'[$1]');
	// 	//var matches = regex.exec(message);

	// 	// if (matches && matches.length >= 4) {
	// 	// 	message = matches[1];
	// 	// }
	// }
	// return message;
}
function showNewLogs(logsHistoryJSON) {
	var _old_logs = logs_history;
	logs_history = JSON.parse(logsHistoryJSON);
	if (_old_logs.length !== logs_history.length) {
		showLogs();
		var text = controller.getPromptText();
		controller.promptText(text);
		sendRuntimeMessage({
			from: 'popup',
			subject: 'popup_opened',
		}, function(response) {});
		
	}
}

function sendMessage(params,callback) {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id,$.extend(params,{
			tabId: tabs[0].id
		}), callback);
	});
}

function sendRuntimeMessage(params,callback) {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function(tabs) {
		chrome.runtime.sendMessage($.extend(params,{
			tabId: tabs[0].id,
			domain: domain
		}), callback);
	});
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
			subject: 'save_command',
			command: command
		}, function(response) {});
	}
}

function evaluateJSExpression(_expression, callback) {
	respone_not_received_timer = setTimeout(function () {
		controller.commandResult(`can't access page, please reload and try again!`,'jquery-console-message-error');
	},1000);
	// ...query for the active tab...
	sendMessage({
		from: 'popup',
		subject: 'evaluate_js_expression',
		expression: _expression
	}, callback);
}

function reduce(arr,filters,exclude) {
	var results =[];
	var excluded = 0;

	if (!arr) {
		return null;
	}
	var count = 1;
	var includeFilterRegex = new RegExp(filters, 'gi');
	var excludeFilterRegex = new RegExp(exclude, 'gi');
	for (var i=0;i<arr.length;i++) {
		arr[i].count = 1;
	}
	for (var i=0;i<arr.length;i++) {
		if (filters || exclude) {
			var msg = prettifyMessage(arr[i]);

			if (!msg.match(includeFilterRegex)) {
				excluded++;
				continue;
			}
			else if (exclude && msg.match(excludeFilterRegex)) {
				excluded++;
				continue;
			}
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
	return {results: results, excluded: excluded};
}

function clear() {
	if (controller) {
		controller.clearScreen();
	}
}

function loadOptions () {
	loading_counts = 0;
	loadSwitch('enabledSwitch', 'enabled', function(result) {
		chrome.storage.sync.get('include_filters', function(result) {
			$('#include_filters').val(result.include_filters);
			$('#include_filters').data('oldVal', $('#include_filters').val());
		});

		chrome.storage.sync.get('exclude_filters', function(result) {
			$('#exclude_filters').val(result.exclude_filters);
			$('#exclude_filters').data('oldVal', $('#exclude_filters').val());
		});
	});

	loadSwitch('notificationSwitch', 'notification_enabled');
	loadSwitch('themeSwitch','theme', function () {
		loadTheme();
	});
	loadSwitch('domainSwitch','domain_notifications' , function ($el, data) {
		$el.bootstrapSwitch('state', data[domain]);
		if (!_switches.enabled || _switches.notification_enabled) {
			$el.bootstrapSwitch('disabled', true);
		}
	})
	loadSwitch('preserveLogsSwitch','preserveLogs')
	loadSwitch('enableLogStackSwitch','enableLogStack')
	loadSwitch('disableCacheSwitch','disableCache')
	loadSwitch('enableWarningsSwitch','enableWarnings');
	loadSwitch('enableAlertsSwitch','enableAlerts');
	loadSwitch('enableErrorsSwitch','enableErrors');
	loadSwitch('enableInfoSwitch','enableInfo');
	
	//loadSwitch('disableIFRAMESwitch','disableIFRAME')
}

function loadSwitch(switchName, key, callback) {
	var $switchName = '#'+ switchName;
	chrome.storage.sync.get(key, function(result) {
		loading_counts++;

		_switches[key] = result[key];
		if (__DEBUG)
			console.log(key , ':' , _switches[key]);

		if (key != 'domain_notifications') {
			$($switchName).bootstrapSwitch('state', _switches[key]);
		}
		if (callback && typeof callback === 'function') {
			callback.call(this,$($switchName),_switches[key]);
		}
		else {
			if (!_switches.enabled) {
				$($switchName).bootstrapSwitch('disabled', true);
			}	
		}

		if (loading_counts == totalLoad) {
			loadLogs();
			loaded = true;
		}
	});
}

function saveSwitch(switchName, key, value, callback) {
	_switches[key] = value;
	var data= {};
	data[key] = value;

	chrome.storage.sync.set(data, function() {
		if (__DEBUG)
			console.log('switch saved ['+switchName+']', key+ '=', value);

		if (callback && typeof callback === 'function') {
			callback.call(this);
		}
	});
}

function loadTheme() {
	if (_switches.theme)
		document.getElementById('theme_css').href = './../lib/bootstrap/css/theme.min.css';
	else
		document.getElementById('theme_css').href = '';
}

function saveOption(id, checked) {
	_gaq.push(['_trackEvent', id+"_"+checked, 'switch']);

	if (id === 'notificationSwitch') {
		saveSwitch('notificationSwitch', 'notification_enabled', checked,  function () {
			if (checked) {
				$('#domainSwitch').bootstrapSwitch('disabled', true);
			} else {
				$('#domainSwitch').bootstrapSwitch('disabled', false);
			}

			sendRuntimeMessage({
				from: 'popup',
				subject: 'disable_notifications',
				enabled: checked
			}, function(response) {
			});
		});
	} else if (id === 'domainSwitch') {
		if (_switches.domain_notifications) {
			_switches.domain_notifications[domain] = checked;
			saveSwitch('domainSwitch', 'domain_notifications', _switches.domain_notifications);

			sendRuntimeMessage({
				from: 'popup',
				subject: 'modify_domain_Notifications',
				enabled: checked
			}, function(response) {
			});
		}
	} else if (id === 'enabledSwitch') {
		saveSwitch('enabledSwitch', 'enabled', checked , function () {
			if (checked) {
				$('#domainSwitch').bootstrapSwitch('disabled', false);
				$('#notificationSwitch').bootstrapSwitch('disabled', false);
				$('#preserveLogsSwitch').bootstrapSwitch('disabled', false);
				$('#enableLogStackSwitch').bootstrapSwitch('disabled', false);
				$('#disableCacheSwitch').bootstrapSwitch('disabled', false);
				$('#enableWarningsSwitch').bootstrapSwitch('disabled', false);
				$('#enableAlertsSwitch').bootstrapSwitch('disabled', false);
				$('#enableErrorsSwitch').bootstrapSwitch('disabled', false);
			} else {
				$('#domainSwitch').bootstrapSwitch('disabled', true);
				$('#notificationSwitch').bootstrapSwitch('disabled', true);
				$('#preserveLogsSwitch').bootstrapSwitch('disabled', true);
				$('#enableLogStackSwitch').bootstrapSwitch('disabled', true);
				$('#disableCacheSwitch').bootstrapSwitch('disabled', true);
				$('#enableWarningsSwitch').bootstrapSwitch('disabled', true);
				$('#enableAlertsSwitch').bootstrapSwitch('disabled', true);
				$('#enableErrorsSwitch').bootstrapSwitch('disabled', true);
			}
			sendRuntimeMessage({
				from: 'popup',
				subject: 'disable_extension',
				enabled: checked
			}, function(response) {});
		});
	} else if (id === 'preserveLogsSwitch') {
		saveSwitch('preserveLogsSwitch', 'preserveLogs', checked , function () {
			loadLogs();
		});
	} else if (id === 'enableLogStackSwitch') {
		saveSwitch('enableLogStackSwitch', 'enableLogStack', checked , function () {
			loadLogs();
		});
	} else if (id === 'disableCacheSwitch') {
		saveSwitch('disableCacheSwitch', 'disableCache', checked, function () {
			sendRuntimeMessage({
				from: 'popup',
				subject: 'disable_cache',
				enabled: checked
			}, function(response) {});
		});
	} else if (id === 'enableWarningsSwitch') {
		saveSwitch('enableWarningsSwitch', 'enableWarnings', checked, function () {
			sendRuntimeMessage({
				from: 'popup',
				subject: 'enable_warnings',
				enabled: checked
			}, function(response) {});
		});
		
	} else if (id === 'themeSwitch') {
		saveSwitch('themeSwitch', 'theme', checked, function () {
			loadTheme();
		});
	} else if (id === 'enableAlertsSwitch') {
		saveSwitch('enableAlertsSwitch', 'enableAlerts', checked, function () {
			sendRuntimeMessage({
				from: 'popup',
				subject: 'enable_alerts',
				enabled: checked
			}, function(response) {});
		});
	} else if (id === 'enableErrorsSwitch') {
		saveSwitch('enableErrorsSwitch', 'enableErrors', checked, function () {
			sendRuntimeMessage({
				from: 'popup',
				subject: 'enable_errors',
				enabled: checked
			}, function(response) {});

		});
	} else if (id === 'enableInfoSwitch') {
		saveSwitch('enableInfoSwitch', 'enableInfo', checked, function () {
			sendRuntimeMessage({
				from: 'popup',
				subject: 'enable_info',
				enabled: checked
			}, function(response) {});

		});
	} else if (id === 'disableConsoleErrorsSwitch') {
		saveSwitch('disableConsoleErrorsSwitch', 'disableConsoleErrors', checked, function () {});
	} 
	//  else if (id === 'disableIFRAMESwitch') {
	// 	saveSwitch('disableIFRAMESwitch', 'disableIFRAME', checked, function () {});
	// }
}

// Listen for messages
chrome.runtime.onMessage.addListener(function(request, sender, response) {
	setTimeout(function() {
	    if (__DEBUG) {
	        console.log('[POPUP::DEBUG] chrome.runtime.onMessage:', request , sender, response);
	    }
		// If the received message has the expected format...
		if (request.from === 'content' && request.subject === 'console_action') {
			loadLogs();
		}
		else if (request.from === 'content' && request.subject === 'logs_all_history_found') {
			init(request.logsHistoryJSON);
		}
		else if (request.from === 'content' && request.subject === 'logs_history_found') {
			if (!logs_history) {
				init(request.logsHistoryJSON);
			}
			else {
				showNewLogs(request.logsHistoryJSON);
			}
		} else if (request.from === 'background' && request.subject === 'preserved_logs') {
			if (request.logsHistoryJSON) {
				if (!logs_history) {
					init(request.logsHistoryJSON);
				}
				else {
					showNewLogs(request.logsHistoryJSON);
				}
			}
		} else if (request.from === 'content' && request.subject === 'expression_found') {
			clearTimeout(respone_not_received_timer);
			respone_not_received_timer = -1;

			if (request.output) {
				var data = JSON.parse(request.output);

				if (typeof data==='string' && (data.indexOf('ReferenceError') > 0)) {
					controller.commandResult(data,'jquery-console-message-error');
				} else if (typeof data==='string' && (data.indexOf('SyntaxError') > 0)) {
					controller.commandResult(data,'jquery-console-message-error');
				} else if (typeof data==='string' && (data.indexOf('TypeError') > 0)) {
					controller.commandResult(data,'jquery-console-message-error');
				} else {
					controller.commandResult(data,'jquery-console-message-value',0,request.expression);
				}
			} else {
				controller.commandResult('undefined','jquery-console-message-error');
			}
		}
	}, 1);
	return true;
});

_gaq = [];
_gaq.push(['_setAccount', 'UA-82270161-1']);

_gaq.push(['_trackEvent','popup','opened']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

if (__DEBUG)
	console.log('popup.js opened!');