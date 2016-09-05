// Paulirish Log wrapper : http://www.paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
var DEBUG = false;
//DEBUG = true;

if (DEBUG) {
    console.log('console.js injected!');
}

window._console = window.console;

var dispatchTimer = -1;

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

var startLogDispatchTimer = function () {
    if (dispatchTimer == -1) {
        dispatchTimer = setTimeout(function () {
            dispatchTimer = -1;
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_found', {
              detail: _JSConsole.messages
            }));
        },50);
    }
}

// Completelety overrride log console.
// http://stackoverflow.com/questions/7042611/override-console-log-for-production
// 
function $debug() {
    if (DEBUG) {
        debugger;
    }
}

window.console = shallowCopy(_console || {});
window.console.isModified = true;

window._JSConsole = _JSConsole || {};
window._JSConsole.messages = [];
window._JSConsole.history = [];

var addLogStackNumber = (function (undefined) {
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
        var line = stack.split('\n')[4];
        // fix for various display text
        line = (line.indexOf(' (') >= 0
            ? line.split(' (')[1].substring(0, line.length - 1)
            : line.split('at ')[1]
            );
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
       //if (typeof DEBUGMODE === typeof undefined || !DEBUGMODE) return;

        // call handler extension which provides stack trace
        return ErrorLog().write(Array.prototype.slice.call(arguments, 0)); // turn into proper array
    };//--  fn  returned

})();//--- logWrapper*/

window.console.log = function(){
    var args = Array.prototype.slice.call(arguments, 0);
    _JSConsole.messages.push({msg:args,action:'log'});
    startLogDispatchTimer();

    var output = addLogStackNumber.apply(null,arguments);

    if (!_console.isModified)
        _console.log.apply(_console,output);

};
window.console.info = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    _JSConsole.messages.push({msg:args,action:'info'});
    startLogDispatchTimer();
    if (!_console)
        _console.info.apply(_console,arguments);
};

window.console.table = function () {
    if (!_console.isModified)
        _console.table.apply(_console,arguments);
};
window.console.dir = function () {
    if (!_console.isModified)
        _console.dir.apply(_console,arguments);
};
window.console.warn = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    _JSConsole.messages.push({msg:args,action:'warn'});
    startLogDispatchTimer();

    var output = addLogStackNumber.apply(null,arguments);
    if (!_console.isModified)
        _console.warn.apply(_console,output);
};

window.console.error = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    _JSConsole.messages.push({msg:args,action:'error'});
    startLogDispatchTimer();

    var output = addLogStackNumber.apply(null,arguments);
    if (!_console.isModified)
        _console.error.apply(_console,output);
};

document.addEventListener('Msg_LogNotificationExtension_received', function(e) {
    if (_JSConsole.messages.length) {
        _JSConsole.history.push(_JSConsole.messages.shift());
        if (_JSConsole.messages.length) {
            startLogDispatchTimer();
        }

    }
});

document.addEventListener('Msg_LogNotificationExtension_get_history', function(e) {
    if (_JSConsole.history) {
        document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_history_found', {
          detail: JSON.stringify(_JSConsole.history)
        }));
    }
});

window.alert = function() {
    // do something here
    var args = Array.prototype.slice.call(arguments, 0);
    
    _JSConsole.messages.push({msg:args,action:'alert'});
    startLogDispatchTimer();

    if (!_console.isModified)
        _console.info.apply(_console,arguments);
};

// window.onerror = function(e, url, line) {
//     if (/Script error/.test(e)) {
//         _JSConsole.messages.push({msg: 'unkown error: ' + e , action: 'unknown'});
//     } else {
//         _JSConsole.messages.push({msg: 'error: ' + e , action: 'error'});
//     }
//     startLogDispatchTimer();
//     return false; 
// }

// handle uncaught errors
window.addEventListener('error', function(e) {
    if(e.filename) {
        var detail = {
            stack: e.error ? e.error.stack : null,
            url: e.filename,
            line: e.lineno,
            col: e.colno,
            message: e.message
        }
        
        if (/Script error/.test(detail.message)) {
            _JSConsole.messages.push({msg: detail.message , action: 'unknown'});
        } else {
            _JSConsole.messages.push({msg: detail.message , action: 'error'});
        }

        startLogDispatchTimer();
    }
});