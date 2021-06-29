import Preferences, { UserPreferencesKeys, USER_PREFERENCES_KEY} from '../modules/preferences.js';

// Stackoverflow : http://stackoverflow.com/questions/9515704/building-a-chrome-extension-inject-code-in-a-page-using-a-content-script/9517879#9517879
// Read it from the storage
var __DEBUG = false;

var injectedFiles = [];

var __mini_js_console_loaded = false;

var console = window.console;

var isTopWindow = window == window.top;

if (__DEBUG) {
    console.log('[CONTENT::DEBUG] content.js started!', window.location.hostname);
}


/**
 * @license domReady 2.0.1 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/domReady/LICENSE
 */
/*jslint */
/*global require: false, define: false, requirejs: false,
  window: false, clearInterval: false, document: false,
  self: false, setInterval: false */

var isTop, testDiv, scrollIntervalId,
    isBrowser = typeof window !== "undefined" && window.document,
    isPageLoaded = !isBrowser,
    doc = isBrowser ? document : null,
    readyCalls = [],
    times = 0;

function pageLoaded() {
    if (!isPageLoaded) {
        isPageLoaded = true;
        if (scrollIntervalId) {
            clearInterval(scrollIntervalId);
        }
    }
}

if (isBrowser) {
    if (document.addEventListener) {
        //Standards. Hooray! Assumption here that if standards based,
        //it knows about DOMContentLoaded.
        document.addEventListener("DOMContentLoaded", pageLoaded, false);
        window.addEventListener("load", pageLoaded, false);
    } else if (window.attachEvent) {
        window.attachEvent("onload", pageLoaded);

        testDiv = document.createElement('div');
        try {
            isTop = window.frameElement === null;
        } catch (e) {
            if (__DEBUG)
                console.warn(e);
        }

        //DOMContentLoaded approximation that uses a doScroll, as found by
        //Diego Perini: http://javascript.nwbox.com/IEContentLoaded/,
        //but modified by other contributors, including jdalton
        if (testDiv.doScroll && isTop && window.external) {
            scrollIntervalId = setInterval(function() {
                try {
                    testDiv.doScroll();
                    pageLoaded();
                } catch (e) {
                    if (__DEBUG)
                        console.warn(e);
                }
            }, 30);
        }
    }

    //Check if document already complete, and if so, just trigger page load
    //listeners. Latest webkit browsers also use "interactive", and
    //will fire the onDOMContentLoaded before "interactive" but not after
    //entering "interactive" or "complete". More details:
    //http://dev.w3.org/html5/spec/the-end.html#the-end
    //http://stackoverflow.com/questions/3665561/document-readystate-of-interactive-vs-ondomcontentloaded
    //Hmm, this is more complicated on further use, see "firing too early"
    //bug: https://github.com/requirejs/domReady/issues/1
    //so removing the || document.readyState === "interactive" test.
    //There is still a window.onload binding that should get fired if
    //DOMContentLoaded is missed.
    if (document.readyState === "complete") {
        pageLoaded();
    }
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function add_JS_File(src) {
    if (injectedFiles.indexOf(src) === -1) {
        injectedFiles.push(src);
        var s = document.createElement('script');
        // TODO: add "script.js" to web_accessible_resources in manifest.json
        s.src = chrome.extension.getURL(src);
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        (document.head || document.documentElement).appendChild(s);

        return true;
    } else {
        return false;
    }
}

function add_CSS_File(src) {
    if (injectedFiles.indexOf(src) === -1) {
        injectedFiles.push(src);

        var link = document.createElement("link");
        link.href = chrome.extension.getURL(src);
        link.type = "text/css";
        link.rel = "stylesheet";
        (document.head || document.documentElement).appendChild(link);

        return true;
    } else {
        return false;
    }
}

function init() {
    var enabled = Preferences.getPreference(UserPreferencesKeys.IS_ACTIVE);
    var enableLogStack = Preferences.getPreference(UserPreferencesKeys.ENABLE_LOG_STACK);

    if (!enabled) return;

    if (!__mini_js_console_loaded) {
        if (isTopWindow) {
            // Stackoverflow : http://stackoverflow.com/questions/9602022/chrome-extension-retrieving-gmails-original-message
            document.addEventListener('Msg_LogNotificationExtension_enabled', function(e) {
                if (__DEBUG) {
                    console.log('[CONTENT::DEBUG] Msg_LogNotificationExtension_enabled: ', e);
                }

                document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_get_enabled', {
                    detail: enabled
                }));

                return enabled;
            });

            document.addEventListener('Msg_LogNotificationExtension_enableLogStack', function(e) {
                if (__DEBUG) {
                    console.log('[CONTENT::DEBUG] Msg_LogNotificationExtension_enableLogStack: ', e);
                }

                document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_get_enableLogStack', {
                    detail: enableLogStack
                }));

                return enableLogStack;
            });
            document.addEventListener('Msg_LogNotificationExtension_js_expression_found', function(e) {
                if (__DEBUG) {
                    console.log('[CONTENT::DEBUG] Msg_LogNotificationExtension_js_expression_found: ', e);
                }
                if (e && e.detail) {
                    try {
                        chrome.runtime.sendMessage({
                            from: 'content',
                            subject: 'expression_found',
                            output: e.detail.results,
                            expression: e.detail.expression,
                        }, response => {
                            if(chrome.runtime.lastError) {
                            } else if (typeof callback == 'function') {
                                callback();
                            }
                        });
                    } catch (e) {
                        if (__DEBUG)
                            console.warn(e);
                    }
                }
            });
            document.addEventListener('Msg_LogNotificationExtension_messages', function(e) {
                if (__DEBUG) {
                    console.log('[CONTENT::DEBUG] Msg_LogNotificationExtension_messages: ', e);
                }
                if (e && e.detail && e.detail.length) {
                    for (var i = 0; i < e.detail.length; i++) {
                        var msg = e.detail[i].msg;
                        var url = e.detail[i].url;
                        var col = e.detail[i].col;
                        var line = e.detail[i].line;
                        var stack = e.detail[i].stack;
                        var action = e.detail[i].action;

                        try {
                            chrome.runtime.sendMessage({
                                from: 'content',
                                subject: 'console_action',
                                domain: window.location.hostname,
                                msg: msg,
                                url: url,
                                line: line,
                                col: col,
                                stack: stack,
                                action: action
                            }, response => {
                                if(chrome.runtime.lastError) {
                                } else {
                                    if (__DEBUG)
                                        console.log('[CONTENT::DEBUG] messages', response);
                                    document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_received', { detail: '' }));
                                }
                            });
                        } catch (e) {
                            if (__DEBUG)
                                console.warn(e);
                        }
                    }
                }
            });

            document.addEventListener('Msg_LogNotificationExtension_history_found', function(e) {
                if (__DEBUG) {
                    console.log('[CONTENT::DEBUG] Msg_LogNotificationExtension_history_found: ', e);
                }
                if (e && e.detail) {
                    try {
                        chrome.runtime.sendMessage({
                            from: 'content',
                            subject: 'logs_history_found',
                            logsHistoryJSON: e.detail
                        }, response => {
                            if(chrome.runtime.lastError) {
                            } else {
                                if (__DEBUG)
                                    console.log('[CONTENT::DEBUG] history_found', response);
                            }
                        });
                    } catch (e) {
                        if (__DEBUG)
                            console.warn(e);
                    }
                }
            });

            document.addEventListener('Msg_LogNotificationExtension_all_history_found', function(e) {
                if (__DEBUG) {
                    console.log('[CONTENT::DEBUG] Msg_LogNotificationExtension_all_history_found: ', e);
                }
                if (e && e.detail) {
                    try {
                        chrome.runtime.sendMessage({
                            from: 'content',
                            subject: 'logs_all_history_found',
                            logsHistoryJSON: e.detail
                        },  response => {
                            if(chrome.runtime.lastError) {
                            } else {
                                if (__DEBUG)
                                    console.log('[CONTENT::DEBUG] all_history_found', response);
                            }
                        });
                    } catch (e) {
                        if (__DEBUG)
                            console.warn(e);
                    }
                }
            });
        }


        __mini_js_console_loaded = true;
    }

    add_JS_File('src/inject/evaluate.js');
    add_JS_File('src/inject/console.js');
}


// Listen for messages from the popup

chrome.runtime.onMessage.addListener(function(request, sender, response) {
    try {
        if (__DEBUG) {
            console.log('[CONTENT::DEBUG] chrome.runtime.onMessage:', request , sender, response);
        }
        // First, validate the message's structure
        if ((request.from === 'popup') && (request.subject === 'get_console_all_history')) {
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_get_all_history', {}));
        } else if ((request.from === 'popup') && (request.subject === 'get_console_history')) {
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_get_history', {}));
        } else if ((request.from === 'popup') && (request.subject === 'evaluate_js_expression') && isTopWindow) {
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_evaluate_js_expression', {
                detail: {
                    expression: request.expression,
                    id: guid()
                }
            }));
        } else if ((request.from === 'popup') && (request.subject === 'init')) {
            if (__DEBUG) {
                console.log('[CONTENT::DEBUG] init message received');
            }
            init(request.enabled);
        } else if ((request.from === 'popup') && (request.subject === 'sync_preferences')) {
            Preferences.load(function () {
            });
        }

    } catch (e) {
        if (__DEBUG)
            console.warn(e);
    } finally {
        // return Promise.resolve("Dummy response to keep the console quiet"); 
    }
    return true;
});


Preferences.load(function (success) {
    init();
})


// chrome.storage.sync.get('disableIFRAME', function(result) {
//  var disableIFRAME = result.disableIFRAME;
//  if (disableIFRAME)
//      add_JS_File('src/inject/disableIFRAME.js');
// });