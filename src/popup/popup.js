import Preferences, { UserPreferencesKeys, USER_PREFERENCES_KEY} from '../modules/preferences.js';

// GLOBAL Variables
var __DEBUG = false;

const DEBOUNCE_TIMEOUT = 250;

var respone_not_received_timer = -1;

var domain = '';

var logs_history = [];

var _cachedMessages = {};

var controller;

var _gaq = [];

var isRendering = false;

if (__DEBUG)
    console.log('[POPUP::DEBUG] started!');

// Register events on DOM READY:
$(function() {
    if (__DEBUG)
        console.log('[POPUP::DEBUG] DOM READY!');
    $('body').on('click', 'a', function() {
        chrome.tabs.create({ url: $(this).attr('href') });
        return false;
    });

    $(".js-btn-toggle").click(function(e) {
        e.preventDefault();     
        $(e.target).toggleClass("toggled");
        if ($(e.target).data('type') == 'Errors') {
            var exclueErrors = Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_ERRORS) || false;
            Preferences.setPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_ERRORS, !exclueErrors);
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'sync_preferences'
            }, response => {
                if(chrome.runtime.lastError) {
                } else if (typeof callback == 'function') {
                    callback();
                }
            });
            updateUI();
            showLogs();
        } else if ($(e.target).data('type') == 'Warnings') {
            var excludeWarnings = Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_WARNINGS) || false;
            Preferences.setPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_WARNINGS, !excludeWarnings);
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'sync_preferences'
            }, response => {
                if(chrome.runtime.lastError) {
                } else if (typeof callback == 'function') {
                    callback();
                }
            });
            updateUI();
            showLogs();
        } else if ($(e.target).data('type') == 'Logs') {
            var excludeLogs = Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_LOGS) || false;
            Preferences.setPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_LOGS, !excludeLogs);
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'sync_preferences'
            }, response => {
                if(chrome.runtime.lastError) {
                } else if (typeof callback == 'function') {
                    callback();
                }
            });
            updateUI();
            showLogs();
        } else if ($(e.target).data('type') == 'Info') {
            var excludeInfo = Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_INFO) || false;
            Preferences.setPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_INFO, !excludeInfo);
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'sync_preferences'
            }, response => {
                if(chrome.runtime.lastError) {
                } else if (typeof callback == 'function') {
                    callback();
                }
            });
            updateUI();
            showLogs();
        } else if ($(e.target).data('type') == 'Styles') {
            var disableStyles = Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.DISABLE_STYLES) || false;
            Preferences.setPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.DISABLE_STYLES, !disableStyles);
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'sync_preferences'
            }, response => {
                if(chrome.runtime.lastError) {
                } else if (typeof callback == 'function') {
                    callback();
                }
            });
            updateUI();
            showLogs();
        }

        return false;
    });

    $(".js-menu-toggle").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("toggled");
        return false;
    });

    $(".js-clear-console").click(function(e) {
        e.preventDefault();
        if (controller) {
            controller.clearScreen();
        }
        // evaluateJSExpression('$JSC.history = [];', function() {});
        setTimeout(function() {
            controller.focus();
        }, 100);
        return false;
    });

    $(".js-history").click(function(e) {
        e.preventDefault();
        loadLogs(true);
        setTimeout(function() {
            controller.focus();
        }, 100);
        return false;
    });

    // init bootstrap switch
    $("[name='bootstrap-switch']").bootstrapSwitch();

    $('#include_filters').on('change keyup', _.debounce(function() {
        if (__DEBUG)
            console.log('[POPUP::DEBUG] debounce event called');
        if ($('#include_filters').data('oldVal') != $('#include_filters').val()) {
            // _gaq.push(['_trackEvent', $('#include_filters').val(), 'include filter']);
            $('#include_filters').data('oldVal', $('#include_filters').val());

            Preferences.setPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.FILTERS_INCLUDED, $('#include_filters').val());
            updateUI();
            showLogs();

            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'sync_preferences'
            }, response => {
                if(chrome.runtime.lastError) {
                } else if (typeof callback == 'function') {
                    callback();
                }
            });
        }
    }, DEBOUNCE_TIMEOUT, false));

    $('#exclude_filters').on('change keyup', _.debounce(function() {
        if (__DEBUG)
            console.log('[POPUP::DEBUG] debounce event called');
        if ($('#exclude_filters').data('oldVal') != $('#exclude_filters').val()) {
            // _gaq.push(['_trackEvent', $('#exclude_filters').val(), 'exclude filter']);
            $('#exclude_filters').data('oldVal', $('#exclude_filters').val());

            Preferences.setPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.FILTERS_EXCLUDED, $('#exclude_filters').val());
            updateUI();
            showLogs();

            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'sync_preferences'
            }, response => {
                if(chrome.runtime.lastError) {
                } else if (typeof callback == 'function') {
                    callback();
                }
            });
        }
    }, DEBOUNCE_TIMEOUT, false));

    $('input[name="bootstrap-switch"]').on('switchChange.bootstrapSwitch', function(event, state) {
        if (isRendering) return;

        if (__DEBUG)
            console.log('[POPUP::DEBUG] switchChange.bootstrapSwitch event called');
        var id = this.id;
        var checked = this.checked;

        // _gaq.push(['_trackEvent', id + "_" + checked, 'switch']);

        if (id === 'extensionNotificationSwitch') {
            Preferences.setPreference(UserPreferencesKeys.SHOW_NOTIFICATIONS, checked);
            updateUI();
            showLogs();
            sendRuntimeMessage({
                from: 'popup',
                subject: 'sync_preferences',
                enabled: checked
            }, function(response) {});
        } else if (id === 'domainNotificationsSwitch') {
            Preferences.setPreferenceForDomain(UserPreferencesKeys.SHOW_NOTIFICATIONS, checked);
            updateUI();
            showLogs();
            sendRuntimeMessage({
                from: 'popup',
                subject: 'sync_preferences',
                enabled: checked
            }, function(response) {});
        } else if (id === 'extensionActiveSwitch') {
            Preferences.setPreference(UserPreferencesKeys.IS_ACTIVE, checked);
            updateUI();
            showLogs();
            sendRuntimeMessage({
                from: 'popup',
                subject: 'sync_preferences',
                enabled: checked
            }, function(response) {});
        } else if (id === 'preserveLogsSwitch') {
            Preferences.setPreference(UserPreferencesKeys.PRESERVE_LOGS, checked);
            updateUI();
            showLogs();
            loadLogs();
            sendRuntimeMessage({
                from: 'popup',
                subject: 'sync_preferences',
                enabled: checked
            }, function(response) {});
        } else if (id === 'enableLogStackSwitch') {
            Preferences.setPreference(UserPreferencesKeys.ENABLE_LOG_STACK, checked);
            updateUI();
            showLogs();
            loadLogs();
        } else if (id === 'disableCacheSwitch') {
            Preferences.setPreference(UserPreferencesKeys.DISABLE_CACHE, checked);
            updateUI();
            showLogs();
            sendRuntimeMessage({
                from: 'popup',
                subject: 'sync_preferences',
                enabled: checked
            }, function(response) {});
        } else if (id === 'enableWarningsSwitch') {
            Preferences.setPreference(UserPreferencesKeys.SHOW_WARNINGS, checked);
            updateUI();
            showLogs();
            sendRuntimeMessage({
                from: 'popup',
                subject: 'sync_preferences',
                enabled: checked
            }, function(response) {});
        } else if (id === 'themeSwitch') {
            Preferences.setPreference(UserPreferencesKeys.THEME, checked);
            updateUI();
            showLogs();
        } else if (id === 'enableAlertsSwitch') {
            Preferences.setPreference(UserPreferencesKeys.SHOW_ALERTS, checked);
            updateUI();
            showLogs();
            sendRuntimeMessage({
                from: 'popup',
                subject: 'sync_preferences',
                enabled: checked
            }, function(response) {});
        } else if (id === 'enableErrorsSwitch') {
            Preferences.setPreference(UserPreferencesKeys.SHOW_ERRORS, checked);
            updateUI();
            showLogs();
            sendRuntimeMessage({
                from: 'popup',
                subject: 'sync_preferences',
                enabled: checked
            }, function(response) {});
        } else if (id === 'enableInfoSwitch') {
            Preferences.setPreference(UserPreferencesKeys.SHOW_INFO, checked);
            updateUI();
            showLogs();
            sendRuntimeMessage({
                from: 'popup',
                subject: 'sync_preferences',
                enabled: checked
            }, function(response) {});
        } 
        //  else if (id === 'disableIFRAMESwitch') {
        //  saveSwitch('disableIFRAMESwitch', 'disableIFRAME', checked, function () {});
        // }
    });

    $('.js-jquery-button').click(function() {
        if (__DEBUG)
            console.log('[POPUP::DEBUG] jquery event called');
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            $.get("https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js", function(result) {
                // _gaq.push(['_trackEvent', 'jquery', 'lib']);
                evaluateJSExpression(result + ';$.fn.jquery');
                $('.js-jquery-button').prop('disabled', true);
            }, "text");
        });
    });

    $('.js-underscore-button').click(function() {
        if (__DEBUG)
            console.log('[POPUP::DEBUG] underscore event called');
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            $.get("http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.2.1/underscore-min.js", function(result) {
                // _gaq.push(['_trackEvent', 'underscore', 'lib']);
                evaluateJSExpression(result + ';_ = window._ || require("underscore");_.VERSION');
                $('.js-underscore-button').prop('disabled', true);
            }, "text");
        });
    });
    $('.btn-toggle').click(function() {
        if (__DEBUG)
            console.log('[POPUP::DEBUG] underscore event called');
        $(this).find('.btn').toggleClass('active');
        if ($(this).find('.btn-primary').size() > 0) {
            $(this).find('.btn').toggleClass('btn-primary');
        }
        if ($(this).find('.btn-danger').size() > 0) {
            $(this).find('.btn').toggleClass('btn-danger');
        }
        if ($(this).find('.btn-success').size() > 0) {
            $(this).find('.btn').toggleClass('btn-success');
        }
        if ($(this).find('.btn-info').size() > 0) {
            $(this).find('.btn').toggleClass('btn-info');
        }
        $(this).find('.btn').toggleClass('btn-default');
    });

    controller = $('.console').empty().console({
        // welcomeMessage: 'New: you can use `$JSC.log` to get log notifications only if the domain enabled!',
        promptLabel: '> ',
        commandValidate: function(line) {
            if (__DEBUG)
                console.log('[POPUP::DEBUG] validate command', line);

            if (line === 'clear' || line === 'clear()') {
                // _gaq.push(['_trackEvent', line, 'command']);
                addToHistory(line);
                if (controller) {
                    controller.clearScreen();
                }
            } else if (line === 'clearHistory' || line === 'clearHistory()') {
                // _gaq.push(['_trackEvent', line, 'command']);
                addToHistory(line);
                controller.commandResult('');
                clearCommandsHistory();
            } else if (line === 'logs' || line === 'logs()') {
                // _gaq.push(['_trackEvent', line, 'command']);
                addToHistory(line);
                showLogs();
            } else if (line === 'cookie') {
                // _gaq.push(['_trackEvent', line, 'command']);
                addToHistory(line);
                evaluateJSExpression('$JSC.cookie()');
            } else if (line.indexOf('cookie(') === 0) {
                addToHistory(line);
                evaluateJSExpression('$JSC.' + line);
            } else if (line) {
                // _gaq.push(['_trackEvent', line, 'expression']);
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
                if (__DEBUG)
                    console.warn(e);
                return e.toString();
            }
        },
        autofocus: true,
        animateScroll: true,
        promptHistory: true
    });
});

function init(logsHistoryJSON) {
    if (__DEBUG)
        console.log('[POPUP::DEBUG] init called!');

    var logs;
    sendRuntimeMessage({
        from: 'popup',
        subject: 'popup_opened'
    }, function(response) {});

    logs_history = JSON.parse(logsHistoryJSON);
    showLogs();

    $("#include_filters").removeAttr('disabled');
    $("#exclude_filters").removeAttr('disabled');
    setTimeout(function() {
        controller.focus();
    }, 100);
}

function loadCommandsHistory() {
    chrome.storage.sync.get('commandsHistory', function(result) {
        if (__DEBUG)
            console.log('[POPUP::DEBUG] loadCommandsHistory result', result);
        if (result.commandsHistory && result.commandsHistory.length) {
            var uniqueHistory = getUniqueArray(result.commandsHistory);
            for (var key in uniqueHistory) {
                var value = uniqueHistory[key];
                controller.addToHistory(value);
            }
        }
    });
}

function loadLogs(loadAll) {
    if (Preferences.getPreference(UserPreferencesKeys.PRESERVE_LOGS)) {
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
        var logs_history_with_filters = filterLogs(logs_history, filters, excludeFilters);
        for (var key in logs_history_with_filters.results) {
            var details = logs_history_with_filters.results[key];

            if (details.msg && details.action) {
                if (details.action == 'error' && Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_ERRORS)) {
                    logs_history_with_filters.excluded++;
                    continue;
                }
                if (details.action == 'warn' && Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_WARNINGS)) {
                    logs_history_with_filters.excluded++;
                    continue;
                }
                if (details.action == 'info' && Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_INFO)) {
                    logs_history_with_filters.excluded++;
                    continue;
                }
                if (details.action == 'alert' && Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_INFO)) {
                    logs_history_with_filters.excluded++;
                    continue;
                }
                if (details.action == 'log' && Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_LOGS)) {
                    logs_history_with_filters.excluded++;
                    continue;
                }

                var disableStyles = Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.DISABLE_STYLES);
                var msg = prettifyMessage(details, !disableStyles);
                if (msg) {
                    logs.push({
                        msg: msg,
                        count: details.count,
                        className: "jquery-console-message-" + details.action
                    });
                }
            }
        }
    }
    if (typeof controller == 'object') {
        if (controller) {
            controller.clearScreen();
        }
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
                controller.commandResult('No Console logs received so far..');
            }
        }
    }
}

function hashCode(str) {
    var hash = 0,
        i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function formatTextMessage(messageObj, uesCustomStyles) {
    var formatted_output = '';
    for (var i = 0; i < messageObj.length; i++) {
        var message = messageObj[i];

        var hasStyleOpened = false;
        for (var j = 0; j< message.length; j++) {
            var nextMessage = messageObj[i+1];
            var char = message[j];
            var prevChar = message[j-1];
            var nextChar = message[j+1];
            if (char == '%' && nextChar == 'c') {
                if (hasStyleOpened) {
                    hasStyleOpened = false;
                    formatted_output += `</span>`;
                }
                i++; // to skip next message from the loop!
                if (uesCustomStyles) {
                    formatted_output += `<span style="${nextMessage}">`;
                    hasStyleOpened = true;
                }

            } else if (char == '%' && nextChar == 's') {
                i++; // to skip next message from the loop!
                formatted_output += nextMessage;

            } else if ((char == 'c' || char == 's' ) && prevChar == '%') {
                // escape these characters from the output
            } else {
                formatted_output += char;
            }
        }
        if (hasStyleOpened) {
            hasStyleOpened = false;
            formatted_output += `</span>`;
        }
    }
    return formatted_output;
}

function prettifyMessage(details, uesCustomStyles) {
    var output = details.msg + '';
    try {
        var key = hashCode(output) + (uesCustomStyles ? '1': '');
        if (_cachedMessages[key]) {
            output = _cachedMessages[key];
        } else {
            var messageObj = output;
            messageObj = JSON.parse(messageObj);

            // has extra formats
            if (output.indexOf('%') != -1 && _.isArray(messageObj)) {
                
                output = formatTextMessage(messageObj, uesCustomStyles);
            } else {
                output = messageObj;
            }

            _cachedMessages[key] = output;
        }
    } catch (e) {
        if (__DEBUG)
            console.warn(e);
    }
    if (details.action == 'error' && details.url) {
        return output + ' at ' + details.url + ':' + details.line + ":" + details.col;
    }

    return output;
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

function sendMessage(params, callback) {
    if (__DEBUG)
        console.log('[POPUP::DEBUG] sendMessage', params, callback);
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, $.extend(params, {
            tabId: tabs[0].id
        }), response => {
            if(chrome.runtime.lastError) {
            } else if (typeof callback == 'function') {
                callback();
            }
        });
    });
}

function sendRuntimeMessage(params, callback) {

    if (__DEBUG)
        console.log('[POPUP::DEBUG] sendRuntimeMessage', params, callback);

    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        chrome.runtime.sendMessage($.extend(params, {
            tabId: tabs[0].id,
            domain: domain
        }), response => {
            if(chrome.runtime.lastError) {
            } else if (typeof callback == 'function') {
                callback();
            }
        });
    });
}

function getUniqueArray(arr) {
    var seen = {};
    var out = [];
    var len = arr.length;
    var j = 0;
    for (var i = 0; i < len; i++) {
        var item = arr[i];
        if (seen[item] !== 1) {
            seen[item] = 1;
            out.push(item);
        }
    }
    return out;
}

function clearCommandsHistory(callback) {
    controller.clearHistory();
    chrome.runtime.sendMessage({
        from: 'popup',
        subject: 'clear_history',
    }, response => {
        if(chrome.runtime.lastError) {
        } else if (typeof callback == 'function') {
            callback();
        }
    });
}

function addToHistory(command, callback) {
    if (command) {
        if (controller) {
            controller.addToHistory(command);
        }
        chrome.runtime.sendMessage({
            from: 'popup',
            subject: 'save_command',
            command: command
        }, response => {
            if(chrome.runtime.lastError) {
            } else if (typeof callback == 'function') {
                callback();
            }
        });
    }
}

function evaluateJSExpression(_expression, callback) {
    respone_not_received_timer = setTimeout(function() {
        var isActive  = Preferences.getPreference(UserPreferencesKeys.IS_ACTIVE);
        if (isActive) {
            controller.commandResult(`can't access page, please reload and try again!`, 'jquery-console-message-error');
        } else {
            controller.commandResult(`Extension disabled, please active and reload the page again!`, 'jquery-console-message-error');
        }
    }, 1000);
    // ...query for the active tab...
    sendMessage({
        from: 'popup',
        subject: 'evaluate_js_expression',
        expression: _expression
    }, response => {
        if(chrome.runtime.lastError) {
        } else if (typeof callback == 'function') {
            callback();
        }
    });
}

function filterLogs(arr, filters, exclude) {
    var results = [];
    var excluded = 0;

    if (!arr) {
        return null;
    }
    var count = 1;
    var includeFilterRegex = new RegExp(filters, 'gi');
    var excludeFilterRegex = new RegExp(exclude, 'gi');
    for (var i = 0; i < arr.length; i++) {
        arr[i].count = 1;
    }
    for (var i = 0; i < arr.length; i++) {
        if (filters || exclude) {
            try {
                var msg = prettifyMessage(arr[i], false);
                // Convert msg to string depending on its type
                if (_.isArray(msg)) {
                    msg = msg.join(' ');
                }
                if (typeof msg === 'object') {
                    msg = JSON.stringify(msg);
                } else if (typeof msg !== 'undefined') {
                    msg = String(msg);
                } else {
                    msg = msg + '';
                }

                if (!msg.match(includeFilterRegex)) {
                    excluded++;
                    continue;
                } else if (exclude && msg.match(excludeFilterRegex)) {
                    excluded++;
                    continue;
                }
            } catch (e) {
                if (__DEBUG)
                    console.warn(e);
            }
        }
        if (_.isEqual(arr[i + 1], arr[i])) {
            count++;
            if (i < arr.length) {
                continue;
            }
        }
        if (count > 1) {
            results.push(_.extend(arr[i], { count: count }));
        } else {
            results.push(arr[i]);
        }
        count = 1;
    }
    return { results: results, excluded: excluded };
}


function updateUI() {
    if (__DEBUG) {
        console.log('[POPUP::DEBUG] updateUI called', 'domain:' , domain);
    }
    isRendering = true;

    var isExtensionActive = Preferences.getPreference(UserPreferencesKeys.IS_ACTIVE) && domain != 'extensions';
    $('#extensionActiveSwitch').bootstrapSwitch('state', isExtensionActive);

    $('#extensionNotificationSwitch').bootstrapSwitch('disabled', !isExtensionActive);
    $('#preserveLogsSwitch').bootstrapSwitch('disabled', !isExtensionActive);
    $('#enableLogStackSwitch').bootstrapSwitch('disabled', !isExtensionActive);
    $('#disableCacheSwitch').bootstrapSwitch('disabled', !isExtensionActive);
    $('#enableWarningsSwitch').bootstrapSwitch('disabled', !isExtensionActive);
    $('#enableAlertsSwitch').bootstrapSwitch('disabled', !isExtensionActive);
    $('#enableErrorsSwitch').bootstrapSwitch('disabled', !isExtensionActive);

    $('#domainNotificationsSwitch').bootstrapSwitch('state', Preferences.getPreferenceForDomain(UserPreferencesKeys.SHOW_NOTIFICATIONS));

    $('#extensionNotificationSwitch').bootstrapSwitch('state', Preferences.getPreference(UserPreferencesKeys.SHOW_NOTIFICATIONS));
    $('#preserveLogsSwitch').bootstrapSwitch('state', Preferences.getPreference(UserPreferencesKeys.PRESERVE_LOGS));
    $('#enableLogStackSwitch').bootstrapSwitch('state', Preferences.getPreference(UserPreferencesKeys.ENABLE_LOG_STACK));
    $('#disableCacheSwitch').bootstrapSwitch('state', Preferences.getPreference(UserPreferencesKeys.DISABLE_CACHE));
    $('#enableWarningsSwitch').bootstrapSwitch('state', Preferences.getPreference(UserPreferencesKeys.SHOW_WARNINGS));
    $('#enableAlertsSwitch').bootstrapSwitch('state', Preferences.getPreference(UserPreferencesKeys.SHOW_ALERTS));
    $('#enableErrorsSwitch').bootstrapSwitch('state', Preferences.getPreference(UserPreferencesKeys.SHOW_ERRORS));
    $('#enableInfoSwitch').bootstrapSwitch('state', Preferences.getPreference(UserPreferencesKeys.SHOW_INFO));

    var isNotificationEnabled = Preferences.getPreference(UserPreferencesKeys.SHOW_NOTIFICATIONS);
    $('#domainNotificationsSwitch').bootstrapSwitch('disabled', isNotificationEnabled || !isExtensionActive);

    if (Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_ERRORS)) {
        $('.js-btn-toggle').filter('[data-type="Errors"]').addClass('toggled');
    }
    if (Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_WARNINGS)) {
        $('.js-btn-toggle').filter('[data-type="Warnings"]').addClass('toggled');
    }
    if (Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_INFO)) {
        $('.js-btn-toggle').filter('[data-type="Info"]').addClass('toggled');
    }
    if (Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.EXCLUDE_LOGS)) {
        $('.js-btn-toggle').filter('[data-type="Logs"]').addClass('toggled');
    }
    if (Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.DISABLE_STYLES)) {
        $('.js-btn-toggle').filter('[data-type="Styles"]').addClass('toggled');
    }

    var includeFilterRegex = Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.FILTERS_INCLUDED);
    if (includeFilterRegex) {
        $('#include_filters').val(includeFilterRegex);
        $('#include_filters').data('oldVal', $('#include_filters').val());
    }

    var excludeFilterRegex = Preferences.getPreferenceForDomain(UserPreferencesKeys.DOMAIN_PREFRENCES.FILTERS_EXCLUDED);
    if (excludeFilterRegex) {
        $('#exclude_filters').val(excludeFilterRegex);
        $('#exclude_filters').data('oldVal', $('#exclude_filters').val());
    }
    if (Preferences.getPreference(UserPreferencesKeys.THEME)) {
        document.getElementById('theme_css').href = './../lib/bootstrap/css/theme.min.css';
    } else {
        document.getElementById('theme_css').href = '';
    }
    isRendering = false;
}


// init
chrome.tabs.query({
        active: true,
        currentWindow: true
    },
    function(tabs) {
        if (__DEBUG)
            console.log('[POPUP::DEBUG] tab query called!', tabs);
        var parser = document.createElement('a');
        parser.href = tabs[0].url;
        domain = parser.hostname;

        Preferences.setDomain(domain);

        (function() {
            var ga = document.createElement('script');
            ga.type = 'text/javascript';
            ga.async = true;
            ga.src = 'https://ssl.google-analytics.com/ga.js';
            var s = document.getElementsByTagName('script')[0];
            s.parentNode.insertBefore(ga, s);
        })();

        _gaq.push(['_setAccount', 'UA-82270161-1']);

        _gaq.push(['_trackEvent', 'popup', 'opened']);

        Preferences.load(function (success) {
            updateUI();
            loadLogs();
            loadCommandsHistory();
        })
        
        chrome.runtime.onMessage.addListener(function(request, sender, response) {
            try {
                if (__DEBUG) {
                    console.log('[POPUP::DEBUG] chrome.runtime.onMessage:', request, sender, response);
                }
                // If the received message has the expected format...
                if (request.from === 'content' && request.subject === 'console_action') {
                    loadLogs();
                } else if (request.from === 'content' && request.subject === 'logs_all_history_found') {
                    init(request.logsHistoryJSON);
                } else if (request.from === 'content' && request.subject === 'logs_history_found') {
                    if (!logs_history || !logs_history.length) {
                        init(request.logsHistoryJSON);
                    } else {
                        showNewLogs(request.logsHistoryJSON);
                    }
                } else if (request.from === 'background' && request.subject === 'preserved_logs') {
                    if (request.logsHistoryJSON) {
                        if (!logs_history) {
                            init(request.logsHistoryJSON);
                        } else {
                            init(request.logsHistoryJSON);
                        }
                    }
                } else if (request.from === 'content' && request.subject === 'expression_found') {
                    clearTimeout(respone_not_received_timer);
                    respone_not_received_timer = -1;

                    if (request.output) {
                        var data = JSON.parse(request.output);
                        if (data == "undefined" || (_.isArray(data) && !data.length)) {
                            controller.commandResult('');
                            // return Promise.resolve("Dummy response to keep the console quiet");
                            return true;
                        }
                        if (typeof data === 'string' && (data.indexOf('ReferenceError') > 0)) {
                            controller.commandResult(data, 'jquery-console-message-error');
                        } else if (typeof data === 'string' && (data.indexOf('SyntaxError') > 0)) {
                            controller.commandResult(data, 'jquery-console-message-error');
                        } else if (typeof data === 'string' && (data.indexOf('TypeError') > 0)) {
                            controller.commandResult(data, 'jquery-console-message-error');
                        } else {
                            controller.commandResult(data, 'jquery-console-message-value', 0, request.expression);
                        }
                    } else {
                        //  controller.commandResult('undefined', 'jquery-console-message-error');
                    }
                }
            } catch (e) {
                if (__DEBUG)
                    console.warn(e);
            } finally {
                // return Promise.resolve("Dummy response to keep the console quiet"); 
            }
            return true;
        });
    }
);

if (__DEBUG)
    console.log('[POPUP::DEBUG] completed!');