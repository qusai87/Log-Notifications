// Stackoverflow : http://stackoverflow.com/questions/9515704/building-a-chrome-extension-inject-code-in-a-page-using-a-content-script/9517879#9517879
// Read it from the storage
var DEBUG = false;
var console = window.console;
if (DEBUG)
	console.log('content.js started!');

chrome.storage.sync.get('enabled', function(result) {
	var enabled = result.enabled;
	init(enabled);
});

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
        readyCalls = [], times = 0;

function pageLoaded() {
    if (!isPageLoaded) {
        isPageLoaded = true;
        if (scrollIntervalId) {
            clearInterval(scrollIntervalId);
        }

        var completed = false;
        if (window.location.hostname.indexOf('booking.facebook') != -1) {
        	var rightPane = document.querySelector('[id="rightCol"]');
        	var rightPane_width = 0;
			if (rightPane) {
				rightPane_width =  parseInt (window.getComputedStyle(rightPane.firstChild.firstChild).width);
			}

        	var pagelet_web_messenger = document.querySelector('#pagelet_web_messenger');
        	var globalContainer = document.querySelector('#globalContainer');

        	if (pagelet_web_messenger && globalContainer && rightPane_width) 
        	{
        		var pagelet_web_messenger_width = parseInt(window.getComputedStyle(pagelet_web_messenger).width);
        		var leftPane = pagelet_web_messenger.querySelector('.wmMasterView');
        		var mainPane = pagelet_web_messenger.querySelector('[role="main"]');
        		if (leftPane && mainPane) {
	        		var mainPane_width = parseInt(window.getComputedStyle(mainPane).width);
	        		var leftPane_width = parseInt(window.getComputedStyle(leftPane).width);
	        		var max = pagelet_web_messenger_width+rightPane_width-leftPane_width - 20;

					if (mainPane) {
						var content = mainPane.querySelector('.uiScrollableAreaContent');
						if (content) {
							var height = parseInt (window.getComputedStyle(content).height);
						}
						if (mainPane && height>20) {
							var newWidth = Math.min(max, rightPane_width + mainPane_width);
        					globalContainer.style.width  = newWidth + leftPane_width + 10 + 'px'
							mainPane.style.width = newWidth + 'px';
							mainPane.querySelector('.uiScrollableArea').style.width="100%";
							mainPane.querySelector('.uiScrollableAreaBody').style.width="100%";
							if (rightPane)
								rightPane.style.display = 'none';
							completed = true;
						}
					}
        		}
        	} 

        	if (!completed && times<20) {
        		times ++;
        		console.log('restart fix facebook chat');
        		isPageLoaded = false;
				setTimeout(pageLoaded,100); //restart until it complete everything!
        	} else {
        		window.$debug && $debug();
        	}
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
        } catch (e) {}

        //DOMContentLoaded approximation that uses a doScroll, as found by
        //Diego Perini: http://javascript.nwbox.com/IEContentLoaded/,
        //but modified by other contributors, including jdalton
        if (testDiv.doScroll && isTop && window.external) {
            scrollIntervalId = setInterval(function () {
                try {
                    testDiv.doScroll();
                    pageLoaded();
                } catch (e) {}
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

var injectedFiles = [];
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
function init(enabled) {
	// Stackoverflow : http://stackoverflow.com/questions/9602022/chrome-extension-retrieving-gmails-original-message

	if (enabled) {
		if (add_JS_File('src/inject/evaluate.js')) {
			document.addEventListener('Msg_LogNotificationExtension_js_expression_found', function(e) {
				if (DEBUG)
					console.log(e);
				if (e && e.detail) {
					chrome.runtime.sendMessage({
						from: 'content',
						subject: 'expression_found',
						output: e.detail.results,
						expression : e.detail.expression,
					}, function(response) {});
				}
			});
		}
		

		if (add_JS_File('src/inject/console.js')) {
			document.addEventListener('Msg_LogNotificationExtension_found', function(e) {
				if (e && e.detail && e.detail.length) {
					var msg = e.detail[0].msg;
					var action = e.detail[0].action;
					chrome.runtime.sendMessage({
						from: 'content',
						subject: 'console_action',
						domain: window.location.hostname,
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

		if (window.location.hostname.indexOf('dev.booking') != -1)
			add_CSS_File('src/inject/styles.css');

	}
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, response) 
{
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
			console.log('init message received');
		}
		init(request.enabled);
	}   
});