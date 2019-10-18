$JSC = window.$JSC || {};

// Paulirish Log wrapper : http://www.paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
$JSC.__DEBUG = false;
$JSC.debuggerMode = false;
$JSC.enableStack = false;

if (!window.console.isOverrided && !window.console.isModified) {
    if ($JSC.__DEBUG) {
        console.log('[CONSOLE::DEBUG] console.js injected!');
    }

    $JSC.dispatchTimer = -1;

    // shallow copy object, thanks to http://geniuscarrier.com/copy-object-in-javascript/
    $JSC.shallowCopy = function (oldObj) {
        var newObj = {};
        for(var i in oldObj) {
            //if(oldObj.hasOwnProperty(i)) {
                newObj[i] = oldObj[i];
            //}
        }
        return newObj;
    }

    $JSC.startLogDispatchTimer = function () {
        if ($JSC.dispatchTimer != -1) {
            clearTimeout($JSC.dispatchTimer);
        }
        $JSC.dispatchTimer = setTimeout(function () {
            $JSC.dispatchTimer = -1;
            if ($JSC.messages.length) {
                document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_messages', {
                  detail: $JSC.messages
                }));
            }
        }, 250);
    }

    // Completelety overrride log console.
    // http://stackoverflow.com/questions/7042611/override-console-log-for-production
    // 

    // Take shallow copy of console methods
    $JSC._console = $JSC.shallowCopy(window.console || {}); 

    // Add flag to detect if current console methods is overrided!
    window.console.isOverrided = true;
    window.console.original = $JSC._console;


    $JSC.messages = [];
    $JSC.history = [];
    $JSC.all_history = [];

    var addLogStackWrapper = function (undefined) {
        if (!$JSC.enableStack) {
            return function () {
                return Array.prototype.slice.call(arguments, 0);
            }
        }
        var ErrorLog = Error; // does this do anything?  proper inheritance...?
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

    window.console.log = function() {
        var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);
        $JSC.messages.push({msg:args,action:'log'});
        $JSC.startLogDispatchTimer();

        var output = addLogStackNumber.apply(null,arguments);

        if (! $JSC._console.isOverrided &&  $JSC._console.log) {
             $JSC._console.log.apply( $JSC._console,output);
        }
    };
    window.console.info = function () {
        var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);
        $JSC.messages.push({msg:args,action:'info'});
        $JSC.startLogDispatchTimer();
        if (! $JSC._console.isOverrided &&  $JSC._console.info)
             $JSC._console.info.apply( $JSC._console,arguments);
    };

    window.console.table = function () {
        if (! $JSC._console.isOverrided)
             $JSC._console.table.apply( $JSC._console,arguments);
    };

    window.console.dir = function () {
        if (! $JSC._console.isOverrided &&  $JSC._console.dir)
             $JSC._console.dir.apply( $JSC._console,arguments);
    };

    window.console.warn = function () {
        var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);
        $JSC.messages.push({msg:args,action:'warn'});
        $JSC.startLogDispatchTimer();

        var output = addLogStackNumber.apply(null,arguments);
        if (! $JSC._console.isOverrided &&  $JSC._console.warn)
             $JSC._console.warn.apply( $JSC._console,output);
    };

    window.console.error = function () {
        var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);
        $JSC.messages.push({msg:args,action:'error'});
        $JSC.startLogDispatchTimer();

        var output = addLogStackNumber.apply(null,arguments);
        if (! $JSC._console.isOverrided &&  $JSC._console.error)
             $JSC._console.error.apply( $JSC._console,output);
    };

    document.addEventListener('Msg_LogNotificationExtension_get_history', function(e) {
        if ($JSC.__DEBUG) {
            $JSC._console.log('[CONSOLE::DEBUG] Msg_LogNotificationExtension_get_history: ', e);
        }
        if ($JSC.history) {
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_history_found', {
              detail: JSON.stringify($JSC.history)
            }));
        }
    });

    document.addEventListener('Msg_LogNotificationExtension_get_all_history', function(e) {
        if ($JSC.__DEBUG) {
            $JSC._console.log('[CONSOLE::DEBUG] Msg_LogNotificationExtension_get_all_history: ', e);
        }
        if ($JSC.all_history) {
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_all_history_found', {
              detail: JSON.stringify($JSC.all_history)
            }));
        }
    });

    document.addEventListener('Msg_LogNotificationExtension_received', function(e) {
        if ($JSC.__DEBUG) {
            $JSC._console.log('[CONSOLE::DEBUG] Msg_LogNotificationExtension_received: ', e);
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
                $JSC.startLogDispatchTimer();
            }
        }
    });

    document.addEventListener('Msg_LogNotificationExtension_get_enableLogStack', function(e) {
        if ($JSC.__DEBUG) {
            $JSC._console.log('[CONSOLE::DEBUG] Msg_LogNotificationExtension_get_enableLogStack: ', e);
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
        $JSC.startLogDispatchTimer();

        if (! $JSC._console.isOverrided &&  $JSC._console.info)
             $JSC._console.info.apply( $JSC._console,arguments);
    };

    // window.onerror = function(e, url, line) {
    //     if (/Script error/.test(e)) {
    //         $JSC.messages.push({msg: 'unkown error: ' + e , action: 'unknown'});
    //     } else {
    //         $JSC.messages.push({msg: 'error: ' + e , action: 'error'});
    //     }
    //     $JSC.startLogDispatchTimer();
    //     return false; 
    // }

    // handle uncaught errors
    window.addEventListener('error', function(e) {
        if ($JSC.__DEBUG) {
            $JSC._console.log('[CONSOLE::DEBUG] error listener: ', e);
        }
        var detail = {
            stack: e.error ? e.error.stack : null,
            url: e.filename,
            line: e.lineno,
            col: e.colno,
            message: e.message
        }

        if (/Script error/.test(detail.message)) {
            $JSC.messages.push({msg: detail.message , action: 'unknown'});
        } else {
            $JSC.messages.push({msg: detail.message , action: 'error'});
        }

        $JSC.startLogDispatchTimer();
    });

    $JSC.log = function () {
        var args = (arguments.length == 1) ? arguments[0] : Array.prototype.slice.call(arguments, 0);
        $JSC.messages.push({msg:args,action:'$log'});
        $JSC.startLogDispatchTimer();

        var output = addLogStackNumber.apply(null,arguments);

        if (! $JSC._console.isOverrided &&  $JSC._console.log) {
             $JSC._console.log.apply( $JSC._console,output);
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