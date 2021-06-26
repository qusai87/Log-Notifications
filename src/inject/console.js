$JSC = window.$JSC || {
    debuggerMode: false,
    enableStack: false,
};

(function ($JSC, console) {
    var __DEBUG = false;
    var __dispatchTimer = -1;

    if (__DEBUG) {
        console.log('[CONSOLE::DEBUG] console.js started!');
    }

    // shallow copy object, thanks to http://geniuscarrier.com/copy-object-in-javascript/
    var shallowCopy = function (oldObj) {
        var newObj = {};
        for(var i in oldObj) {
            //if(oldObj.hasOwnProperty(i)) {
                newObj[i] = oldObj[i];
            //}
        }
        return newObj;
    }

    var __startSendMessagestimer = function () {
        if (__dispatchTimer != -1) {
            clearTimeout(__dispatchTimer);
        }
        __dispatchTimer = setTimeout(function () {
            __dispatchTimer = -1;
            if ($JSC.messages.length) {
                document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_messages', {
                  detail: $JSC.messages
                }));
            }
        }, 250);
    }

    var __addNewMessage = function (messageObj, stack, url, line, col, action) {
        if (messageObj instanceof Node) {
            messageObj = `<${messageObj.nodeName}>` + messageObj.innerText + `</${messageObj.nodeName}>`;
        }

        $JSC.messages.push({
            msg: JSON.stringify(messageObj),
            stack: stack,
            url: url,
            line: line,
            col: col,
            action: action,
        });

        __startSendMessagestimer();
    }

    if (!console.isOverrided) {
        if (__DEBUG) {
            console.log('[CONSOLE::DEBUG] Overriding window.console!');
        }

        // Take shallow copy of console methods
        var __console = shallowCopy(console || {}); 

        // Add flag to detect if current console methods is overrided!
        console.isOverrided = true;


        $JSC.messages = [];
        $JSC.history = [];
        $JSC.all_history = [];

        var addLogStackWrapper = function (undefined) {
            if (!$JSC.enableStack) {
                return function () {
                    return Array.prototype.slice.call(arguments, 0);
                }
            }
            var ErrorLog = Error;
            ErrorLog.prototype.write = function (args) {
                /// <summary>
                /// Paulirish-like console.log wrapper.  Includes stack trace via @fredrik SO suggestion (see remarks for sources).
                /// </summary>
                /// <param name="args" type="Array">list of details to log, as provided by `arguments`</param>
                /// <remarks>Includes line numbers by calling Error object -- see
                /// * http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
                /// * http://stackoverflow.com/questions/13815640/a-proper-wrapper-for-console-log-with-correct-line-number
                /// * http://stackoverflow.com/a/3806596/1037948
                /// </remarks>

                // via @fredrik SO trace suggestion; wrapping in special construct so it stands out
                // _console.log(this.lineNumber); // check lineNumber
                var suffix = {
                    "@": (this.lineNumber
                            ? this.fileName + ':' + this.lineNumber + ":1" // add arbitrary column value for chrome linking
                            : extractLineNumberFromStack(this.stack)
                    )
                };
                if (suffix["@"].indexOf('chrome-extension')==-1 && suffix["@"].indexOf('anonymous') === -1)
                    args = args.concat(suffix["@"]);
                return args;
            };
            var extractLineNumberFromStack = function (stack) {
                /// <summary>
                /// Get the line/filename detail from a Webkit stack trace.  See http://stackoverflow.com/a/3806596/1037948
                /// </summary>
                /// <param name="stack" type="String">the stack string</param>

                // correct line number according to how ErrorLog().write implemented
                try {
                    var line = stack.split('\n')[4];
                    // fix for various display text
                    line = (line.indexOf(' (') >= 0
                        ? line.split(' (')[1].substring(0, line.length - 1)
                        : line.split('at ')[1]
                        );
                    
                } catch (e) {
                    return '';
                }
                // I should find a better way to align line ref to right (as chrome dev tools)
                //return ["Node count: %d, and the time is %f.", document.childNodes.length, Date.now()]
                return '\n at: \t' + line;
            };

            return function (params) {
                /// <summary>
                /// Paulirish-like console.log wrapper
                /// </summary>
                /// <param name="params" type="[...]">list your logging parameters</param>

                // only if explicitly true somewhere

                // call handler extension which provides stack trace
                return ErrorLog().write(Array.prototype.slice.call(arguments, 0)); // turn into proper array
            };//--  fn  returned

        };

        addLogStackNumber = addLogStackWrapper();

        console.log = function() {
            var stack = (new Error()).stack.split("\n").splice(2, 4).join("\n");
            var stackLines = stack.split("\n");
            var callSrc = (stackLines.length > 1 && (/^.*?\((.*?):(\d+):(\d+)/.exec(stackLines[1]) || /(\w+:\/\/.*?):(\d+):(\d+)/.exec(stackLines[1]))) || [null, null, null, null];

            var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);

            __addNewMessage(args, stackLines.join("\n"), callSrc[1], callSrc[2], callSrc[3], 'log');

            var output = addLogStackNumber.apply(null, arguments);

            if (! __console.isOverrided &&  __console.log) {
                __console.log.apply( __console, output);
            }
        };
        console.info = function () {
            var stack = (new Error()).stack.split("\n").splice(2, 4).join("\n");
            var stackLines = stack.split("\n");
            var callSrc = (stackLines.length > 1 && (/^.*?\((.*?):(\d+):(\d+)/.exec(stackLines[1]) || /(\w+:\/\/.*?):(\d+):(\d+)/.exec(stackLines[1]))) || [null, null, null, null];

            var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);

            __addNewMessage(args, stackLines.join("\n"), callSrc[1], callSrc[2], callSrc[3], 'info');

            var output = addLogStackNumber.apply(null, arguments);
            if (! __console.isOverrided &&  __console.info) {
                __console.info.apply( __console, output);
            }
        };

        console.table = function () {
            var output = addLogStackNumber.apply(null, arguments);
            if (! __console.isOverrided) {
                __console.table.apply( __console, output);
            }
        };

        console.dir = function () {
            var output = addLogStackNumber.apply(null, arguments);
            if (! __console.isOverrided &&  __console.dir) {
                __console.dir.apply( __console, output);
            }
        };

        console.warn = function () {
            var stack = (new Error()).stack.split("\n").splice(2, 4).join("\n");
            var stackLines = stack.split("\n");
            var callSrc = (stackLines.length > 1 && (/^.*?\((.*?):(\d+):(\d+)/.exec(stackLines[1]) || /(\w+:\/\/.*?):(\d+):(\d+)/.exec(stackLines[1]))) || [null, null, null, null];

            var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);

            __addNewMessage(args, stackLines.join("\n"), callSrc[1], callSrc[2], callSrc[3], 'warn');

            var output = addLogStackNumber.apply(null, arguments);
            if (! __console.isOverrided &&  __console.warn) {
                __console.warn.apply( __console,output);
            }
        };

        console.error = function () {
            var stack = (new Error()).stack.split("\n").splice(2, 4).join("\n");
            var stackLines = stack.split("\n");
            var callSrc = (stackLines.length > 1 && (/^.*?\((.*?):(\d+):(\d+)/.exec(stackLines[1]) || /(\w+:\/\/.*?):(\d+):(\d+)/.exec(stackLines[1]))) || [null, null, null, null];

            var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);

            __addNewMessage(args, stackLines.join("\n"), callSrc[1], callSrc[2], callSrc[3], 'error');

            var output = addLogStackNumber.apply(null, arguments);
            if (! __console.isOverrided &&  __console.error) {
                __console.error.apply( __console,output);
            }
        };

        document.addEventListener('Msg_LogNotificationExtension_get_history', function(e) {
            if (__DEBUG) {
                __console.log('[CONSOLE::DEBUG] Msg_LogNotificationExtension_get_history: ', e);
            }
            if ($JSC.history) {
                document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_history_found', {
                  detail: JSON.stringify($JSC.history)
                }));
            }
        });

        document.addEventListener('Msg_LogNotificationExtension_get_all_history', function(e) {
            if (__DEBUG) {
                __console.log('[CONSOLE::DEBUG] Msg_LogNotificationExtension_get_all_history: ', e);
            }
            if ($JSC.all_history) {
                document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_all_history_found', {
                  detail: JSON.stringify($JSC.all_history)
                }));
            }
        });

        document.addEventListener('Msg_LogNotificationExtension_received', function(e) {
            if (__DEBUG) {
                __console.log('[CONSOLE::DEBUG] Msg_LogNotificationExtension_received: ', e);
            }
            if ($JSC.messages.length) {
                $JSC.history = $JSC.history.concat($JSC.messages);
                $JSC.all_history = $JSC.all_history.concat($JSC.messages);
                $JSC.messages = [];
                //$JSC.history.push($JSC.messages.shift());
                if ($JSC.history.length> 1000) {
                    $JSC.history = $JSC.history.slice(Math.max($JSC.history.length - 1000, 1));
                }
                if ($JSC.all_history.length> 1000) {
                    $JSC.all_history = $JSC.all_history.slice(Math.max($JSC.all_history.length - 1000, 1));
                }
                if ($JSC.messages.length) {
                    __startSendMessagestimer();
                }
            }
        });

        document.addEventListener('Msg_LogNotificationExtension_get_enableLogStack', function(e) {
            if (__DEBUG) {
                __console.log('[CONSOLE::DEBUG] Msg_LogNotificationExtension_get_enableLogStack: ', e);
            }
            if (e.detail) {
                $JSC.enableStack = e.detail;
            }

            addLogStackNumber = addLogStackWrapper();
        });

        document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_enableLogStack', { }));

        window.alert = function() {
            var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);
            
            $JSC.messages.push({msg:args,action:'alert'});
            __startSendMessagestimer();

            var output = addLogStackNumber.apply(null, arguments);
            if (! __console.isOverrided &&  __console.info) {
                __console.info.apply( __console, output);
            }
        };

        // handle errors
        window.addEventListener('error', function(e) {
            if (__DEBUG) {
                __console.log('[CONSOLE::DEBUG] handle errors: ', e);
            }
            var src = e.target.src || e.target.href;
            var baseUrl = e.target.baseURI;

            if(src && baseUrl && src != baseUrl) {
                $JSC.messages.push({msg:'file not found: ' + src , action: 'error'});
            } else if (e.message) {
                if (/Script error/.test(e.message)) {
                    $JSC.messages.push({
                        stack: e.error ? e.error.stack : null,
                        url: e.filename,
                        line: e.lineno,
                        col: e.colno,
                        msg: e.message, 
                        action: 'unknown'
                    });
                } else {
                    $JSC.messages.push({
                        stack: e.error ? e.error.stack : null,
                        url: e.filename,
                        line: e.lineno,
                        col: e.colno,
                        msg: e.message, 
                        action: 'error'
                    });
                }

            }
            __startSendMessagestimer();
        }, true);

        // // handle uncaught errors
        // window.addEventListener('error', function(e) {
        //     if (__DEBUG) {
        //         __console.log('[CONSOLE::DEBUG] handle uncaught errors: ', e);
        //     }
            
        // });

        // window.onerror = function(e, url, line) {
        //     debugger;
        //     if (/Script error/.test(e)) {
        //         $JSC.messages.push({msg: 'unkown error: ' + e , action: 'unknown'});
        //     } else {
        //         $JSC.messages.push({msg: 'error: ' + e , action: 'error'});
        //     }
        //     __startSendMessagestimer();
        //     return false; 
        // }

        $JSC.log = function () {
            var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);
            $JSC.messages.push({msg:args,action:'$log'});
            __startSendMessagestimer();

            var output = addLogStackNumber.apply(null, arguments);

            if (! __console.isOverrided &&  __console.log) {
                 __console.log.apply( __console,output);
            }
        };
        $JSC.$debugger = function () {
            if ($JSC.debuggerMode) {
                debugger;
            }
        }

        $JSC.$start_debugger = function () {
            $JSC.debuggerMode = true;
        }

        $JSC.$stop_debugger = function () {
            $JSC.debuggerMode = false;
        }
    }
}($JSC, window.console));
