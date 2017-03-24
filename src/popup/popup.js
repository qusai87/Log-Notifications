// GLOBAL Variables
enabled = true;
notification_enabled = false;
preserveLogs = false;
enableLogStack = false;
disableCache = false;
theme = false;

domain_notifications = {};
respone_not_received_timer = -1;
DEBUG = false;

domain = '';

logs_history = null;

_gaq = [];
_gaq.push(['_setAccount', 'UA-82270161-1']);

_gaq.push(['_trackEvent','popup','opened']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

chrome.tabs.query(
    { 
    	active: true,
		currentWindow: true
    }, 
    function callback(tabs) {
        var parser = document.createElement('a');
        parser.href = tabs[0].url;
        domain = parser.hostname;
    }
);

function init(logsHistoryJSON) {
	var logs;
	sendRuntimeMessage({
		from: 'popup',
		subject: 'popup_opened',
	}, function(response) {});

	logs_history = JSON.parse(logsHistoryJSON);
	showLogs();

	$("#include_filters").removeAttr('disabled');
	$("#exclude_filters").removeAttr('disabled');
	controller.focus();
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

function loadLogs () {
	if (preserveLogs) {
		// update console history from background history
		sendRuntimeMessage({
			from: 'popup',
			subject: 'get_all_history'
		}, function(response) {});
    } else {
    	// update console history from current active tab
		sendMessage({
			from: 'popup',
			subject: 'get_console_history'
		}, function(response) {});
    }
}

function showLogs() {
	var logs = [];
	var filters = $('#include_filters').val();
	var excludeFilters = $('#exclude_filters').val();
	var logs_history_filtered = reduce(logs_history,filters,excludeFilters);
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
	if (typeof controller =='object') {
		if (logs.length) {
			controller.commandResult(logs);
		} else {
			controller.commandResult('No Console logs received!');
		}
		controller.focus();
	}
}

function showNewLogs(logsHistoryJSON) {
	var _old_logs = logs_history;
	logs_history = JSON.parse(logsHistoryJSON);
	var text = controller.getPromptText();
	clear();
	showLogs();
	controller.promptText(text);
	sendRuntimeMessage({
		from: 'popup',
		subject: 'popup_opened',
	}, function(response) {});
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
			tabId: tabs[0].id
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
	sendMessage({
		from: 'popup',
		subject: 'evaluate_js_expression',
		expression: _expression
	}, function() {});
}


function reduce(arr,filters,exclude) {
	var results =[];
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
			var msg = arr[i].msg;
			if (typeof arr[i].msg === 'object') {
				msg = arr[i].msg.join('');
			}
			if (!msg.match(includeFilterRegex))
				continue;
			else if (exclude && msg.match(excludeFilterRegex))
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

function loadOptions () {
	chrome.storage.sync.get('enabled', function(result) {
		enabled = result.enabled;
		console.log('enabled:' , domain_notifications);

		$('#enabledSwitch').bootstrapSwitch('state', enabled);

		$('#include_filters').on('change',function () {
			if ($('#include_filters').data('oldVal') != $('#include_filters').val()) {
				_gaq.push(['_trackEvent',$('#include_filters').val(),'include filter']);
				$('#include_filters').data('oldVal', $('#include_filters').val());
				chrome.storage.sync.set({
					'include_filters': $('#include_filters').val()
				}, function() {
					if (DEBUG)
						console.log('include_filters saved');
					chrome.runtime.sendMessage({
						from: 'popup',
						subject: 'update_filters'
					}, function(response) {});
				});
				clear();
				showLogs();
			}
		});

		$('#exclude_filters').on('change',function () {
			if ($('#exclude_filters').data('oldVal') != $('#exclude_filters').val()) {
				_gaq.push(['_trackEvent',$('#exclude_filters').val(),'exclude filter']);
				$('#exclude_filters').data('oldVal', $('#exclude_filters').val());
				chrome.storage.sync.set({
					'exclude_filters': $('#exclude_filters').val()
				}, function() {
					if (DEBUG)
						console.log('exclude_filters saved');
					chrome.runtime.sendMessage({
						from: 'popup',
						subject: 'update_filters'
					}, function(response) {});
				});
				clear();
				showLogs();
			}
		});

		chrome.storage.sync.get('include_filters', function(result) {
			$('#include_filters').val(result.include_filters);
			$('#include_filters').data('oldVal', $('#include_filters').val());
		});

		chrome.storage.sync.get('exclude_filters', function(result) {
			$('#exclude_filters').val(result.exclude_filters);
			$('#exclude_filters').data('oldVal', $('#exclude_filters').val());
		});
	});

	chrome.storage.sync.get('notification_enabled', function(result) {
		notification_enabled = result.notification_enabled;
		console.log('notifications:' , notification_enabled);

		$('#notificationSwitch').bootstrapSwitch('state', notification_enabled);

		if (!enabled) {
			$('#notificationSwitch').bootstrapSwitch('disabled', true);
		}
	});

	chrome.storage.sync.get('theme', function(result) {
		theme = result.theme;
		console.log('theme:' , theme);

		$('#themeSwitch').bootstrapSwitch('state', theme);

		loadTheme();
	});

	chrome.storage.sync.get('domain_notifications', function(result) {
		domain_notifications = result.domain_notifications;
		console.log('domain_notifications:' , domain_notifications);

		$('#domainSwitch').bootstrapSwitch('state', domain_notifications[domain]);
		
		if (!enabled || notification_enabled) {
			$('#domainSwitch').bootstrapSwitch('disabled', true);
		}
	});

	chrome.storage.sync.get('preserveLogs', function(result) {
		preserveLogs = result.preserveLogs;
		console.log('preserveLogs:' , preserveLogs);

		$('#preserveLogsSwitch').bootstrapSwitch('state', preserveLogs);
		
		if (!enabled) {
			$('#preserveLogsSwitch').bootstrapSwitch('disabled', true);
		}
		loadLogs();			
	});

	chrome.storage.sync.get('enableLogStack', function(result) {
		enableLogStack = result.enableLogStack;
		console.log('enableLogStack:' , enableLogStack);
		
		$('#enableLogStackSwitch').bootstrapSwitch('state', enableLogStack);

		if (!enabled) {
			$('#enableLogStackSwitch').bootstrapSwitch('disabled', true);
		}	
	});

	chrome.storage.sync.get('disableCache', function(result) {
		disableCache = result.disableCache;
		console.log('disableCache:' , disableCache);

		$('#disableCacheSwitch').bootstrapSwitch('state', disableCache);

		if (!enabled) {
			$('#disableCacheSwitch').bootstrapSwitch('disabled', true);
		}	
	});
}

function loadTheme() {
	if (theme)
		document.getElementById('theme_css').href = './../lib/bootstrap/css/theme.min.css';
	else
		document.getElementById('theme_css').href = '';

}

function saveOption(id, checked) {
    _gaq.push(['_trackEvent', id+"_"+checked, 'switch']);

	if (id === 'notificationSwitch') {
    	notification_enabled = checked;

    	if (notification_enabled) {
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
    } else if (id === 'domainSwitch') {
    	domain_notifications[domain] = checked;

    	sendRuntimeMessage({
			from: 'popup',
			subject: 'modify_domain_Notifications',
			domain : domain,
			enabled: checked
		}, function(response) {
		});
    } else if (id === 'enabledSwitch') {
    	enabled = checked; 

    	if (enabled) {
    		$('#domainSwitch').bootstrapSwitch('disabled', false);
    		$('#notificationSwitch').bootstrapSwitch('disabled', false);
    		$('#preserveLogsSwitch').bootstrapSwitch('disabled', false);
    		$('#enableLogStackSwitch').bootstrapSwitch('disabled', false);
			$('#disableCacheSwitch').bootstrapSwitch('disabled', false);
    	} else {
    		$('#domainSwitch').bootstrapSwitch('disabled', true);
    		$('#notificationSwitch').bootstrapSwitch('disabled', true);
    		$('#preserveLogsSwitch').bootstrapSwitch('disabled', true);
    		$('#enableLogStackSwitch').bootstrapSwitch('disabled', true);
			$('#disableCacheSwitch').bootstrapSwitch('disabled', true);
    	}
    	sendRuntimeMessage({
			from: 'popup',
			subject: 'disable_extension',
			enabled: checked
		}, function(response) {});
    } else if (id === 'preserveLogsSwitch') {
    	preserveLogs = checked;
    	clear();
    	loadLogs();

    	chrome.storage.sync.set({'preserveLogs': preserveLogs}, function() {
          if (DEBUG)
          	console.log('preserveLogs saved');
        });
    } else if (id === 'enableLogStackSwitch') {
    	enableLogStack = checked;
    	clear();
    	loadLogs();

    	chrome.storage.sync.set({'enableLogStack': enableLogStack}, function() {
          if (DEBUG)
          	console.log('enableLogStack saved');
        });
    } else if (id === 'disableCacheSwitch') {
    	disableCache = checked;

    	chrome.storage.sync.set({'disableCache': disableCache}, function() {
          if (DEBUG)
          	console.log('disableCache saved');
        });

        sendRuntimeMessage({
			from: 'popup',
			subject: 'disable_cache',
			enabled: checked
		}, function(response) {});
    } else if (id === 'themeSwitch') {
    	theme = checked;

    	chrome.storage.sync.set({'theme': theme}, function() {
          if (DEBUG)
          	console.log('theme saved');
        });

        loadTheme();
    }
}

// Once the DOM is ready...
window.addEventListener('DOMContentLoaded', function() {
	$(document).ready(function() {
	   $('body').on('click', 'a', function(){
	     chrome.tabs.create({url: $(this).attr('href')});
	     return false;
	   });

	   // init bootstrap switch
	   $("[name='bootstrap-switch']").bootstrapSwitch();

	   loadOptions();

	   $('input[name="bootstrap-switch"]').on('switchChange.bootstrapSwitch', function(event, state) {
			var id = this.id;
			var checked = this.checked;

			saveOption(id,checked);
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
			promptLabel: '> ',
			commandValidate: function(line) {
				if (DEBUG)
					console.log('validate',line);

				if (line === 'domains' || line === 'domains()') {
					_gaq.push(['_trackEvent',line,'command']);
					addToHistory(line);
					controller.commandResult(domain_notifications,'jquery-console-message-value');
				} else if (line === 'clear' || line === 'clear()') {
					_gaq.push(['_trackEvent',line,'command']);
					addToHistory(line);
					evaluateJSExpression('_JSConsole.history = []');
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
					evaluateJSExpression('_JSConsole.cookie()');
				} else if (line.indexOf('cookie(') === 0) {
					addToHistory(line);
					evaluateJSExpression('_JSConsole.' + line);
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
			autofocus:true,
			animateScroll: true,
			promptHistory: true,
			welcomeMessage: 'current console logs:'
		});
		loadCommandsHistory();
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
});


if (DEBUG)
    console.log('popup.js opened!');