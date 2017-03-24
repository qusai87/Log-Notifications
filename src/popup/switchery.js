$('.js-switch').each(function () {
	var init = new Switchery(this,{ size: 'small' });
	this.switch = init;
	this.onchange = function () {
		var id = this.id;
		var checked = this.checked;

		if (id === 'notificationSwitch') {
	    	_gaq.push(['_trackEvent', id+"_"+checked, 'switch']);
	    	notification_enabled = checked;

	    	if (notification_enabled) {
	    		domainSwitch.switch.disable();
	    	} else {
	    		domainSwitch.switch.enable();
	    	}

	    	sendRuntimeMessage({
				from: 'popup',
				subject: 'disable_notifications',
				enabled: checked
			}, function(response) {
			});
	    } else if (id === 'domainSwitch') {
	    	_gaq.push(['_trackEvent', id+"_"+checked, 'switch']);
	    	domain_notifications[domain] = checked;

	    	sendRuntimeMessage({
				from: 'popup',
				subject: 'modify_domain_Notifications',
				domain : domain,
				enabled: checked
			}, function(response) {
			});
	    } else if (id === 'enabledSwitch') {
	    	_gaq.push(['_trackEvent', id+"_"+checked, 'switch']);
	    	enabled = checked; 

	    	if (enabled) {
	    		domainSwitch.switch.enable();
	    		notificationSwitch.switch.enable();
	    		preserveLogsSwitch.switch.enable();
	    		enableLogStackSwitch.switch.enable();
				disableCacheSwitch.switch.enable();
	    	} else {
	    		domainSwitch.switch.disable();
	    		notificationSwitch.switch.disable();
	    		preserveLogsSwitch.switch.disable();
	    		enableLogStackSwitch.switch.disable();
				disableCacheSwitch.switch.disable();
	    	}
	    	sendRuntimeMessage({
				from: 'popup',
				subject: 'disable_extension',
				enabled: checked
			}, function(response) {});
	    } else if (id === 'preserveLogsSwitch') {
	    	_gaq.push(['_trackEvent', id+"_"+checked, 'switch']);
	    	preserveLogs = checked;
	    	clear();
	    	loadLogs();

	    	chrome.storage.sync.set({'preserveLogs': preserveLogs}, function() {
	          if (DEBUG)
	          	console.log('preserveLogs saved');
	        });
	    } else if (id === 'enableLogStackSwitch') {
	    	_gaq.push(['_trackEvent', id+"_"+checked, 'switch']);
	    	enableLogStack = checked;
	    	clear();
	    	loadLogs();

	    	chrome.storage.sync.set({'enableLogStack': enableLogStack}, function() {
	          if (DEBUG)
	          	console.log('enableLogStack saved');
	        });
	    } else if (id === 'disableCacheSwitch') {
	    	_gaq.push(['_trackEvent', id+"_"+checked, 'switch']);
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
	    }
	}
});


chrome.storage.sync.get('enabled', function(result) {
	enabled = result.enabled;

	if (enabled) {
		enabledSwitch.checked = true;
	} else {
		enabledSwitch.checked = false;
	}
	enabledSwitch.switch.setPosition();

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

	$('#enabledSwitch').val(enabled?'checked':'');

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
	if (notification_enabled) {
		notificationSwitch.checked = true;
	} else {
		notificationSwitch.checked = false;
	}
	notificationSwitch.switch.setPosition();
	if (!enabled) {
		notificationSwitch.switch.disable();
	}
});

chrome.storage.sync.get('domain_notifications', function(result) {
	domain_notifications = result.domain_notifications;
	console.log('domain_notifications:' , domain_notifications);
	if (domain_notifications[domain]) {
		domainSwitch.checked = true;
	} else {
		domainSwitch.checked = false;
	}
	domainSwitch.switch.setPosition();
	
	if (!enabled || notification_enabled) {
		domainSwitch.switch.disable();
	}
});

chrome.storage.sync.get('preserveLogs', function(result) {
	preserveLogs = result.preserveLogs;
	console.log('preserveLogs:' , preserveLogs);
	if (preserveLogs) {
		preserveLogsSwitch.checked = true;
	} else {
		preserveLogsSwitch.checked = false;
	}
	preserveLogsSwitch.switch.setPosition();
	if (!enabled) {
		preserveLogsSwitch.switch.disable();
	}
	loadLogs();			
});

chrome.storage.sync.get('enableLogStack', function(result) {
	enableLogStack = result.enableLogStack;
	console.log('enableLogStack:' , enableLogStack);
	if (enableLogStack) {
		enableLogStackSwitch.checked = true;
	} else {
		enableLogStackSwitch.checked = false;
	}
	enableLogStackSwitch.switch.setPosition();
	if (!enabled) {
		enableLogStackSwitch.switch.disable();
	}	
});

chrome.storage.sync.get('disableCache', function(result) {
	disableCache = result.disableCache;
	console.log('disableCache:' , disableCache);
	if (disableCache) {
		disableCacheSwitch.checked = true;
	} else {
		disableCacheSwitch.checked = false;
	}
	disableCacheSwitch.switch.setPosition();
	if (!enabled) {
		disableCacheSwitch.switch.disable();
	}	
});