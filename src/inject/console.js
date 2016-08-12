// Paulirish Log wrapper : http://www.paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
var DEBUG = false;
//DEBUG = true;

if (DEBUG)
    console.log('console.js injected!');
var _console = console;

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
              detail: console.__data__.messages
            }));
        },50);
    }
}

// Completelety overrride log console.
// http://stackoverflow.com/questions/7042611/override-console-log-for-production
// 

window.console = shallowCopy(_console || {});
window.console.__data__ = console.__data__ || {};
window.console.__data__.messages = [];
window.console.__data__.history = [];

var addLogStackNumber = (function (undefined) {
    var Log = Error; // does this do anything?  proper inheritance...?
    Log.prototype.write = function (args) {
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
        var suffix = {
            "@": (this.lineNumber
                    ? this.fileName + ':' + this.lineNumber + ":1" // add arbitrary column value for chrome linking
                    : extractLineNumberFromStack(this.stack)
            )
        };
        if (suffix["@"].indexOf('chrome-extension')==-1)
            args = args.concat([suffix["@"]]);
        return args;
    };
    var extractLineNumberFromStack = function (stack) {
        /// <summary>
        /// Get the line/filename detail from a Webkit stack trace.  See http://stackoverflow.com/a/3806596/1037948
        /// </summary>
        /// <param name="stack" type="String">the stack string</param>

        // correct line number according to how Log().write implemented
        var line = stack.split('\n')[4];
        // fix for various display text
        line = (line.indexOf(' (') >= 0
            ? line.split(' (')[1].substring(0, line.length - 1)
            : line.split('at ')[1]
            );
        return line;
    };

    return function (params) {
        /// <summary>
        /// Paulirish-like console.log wrapper
        /// </summary>
        /// <param name="params" type="[...]">list your logging parameters</param>

        // only if explicitly true somewhere
       //if (typeof DEBUGMODE === typeof undefined || !DEBUGMODE) return;

        // call handler extension which provides stack trace
        return Log().write(Array.prototype.slice.call(arguments, 0)); // turn into proper array
    };//--  fn  returned

})();//--- logWrapper*/

window.console.log = function(){
    var args = Array.prototype.slice.call(arguments, 0);
    console.__data__.messages.push({msg:args,action:'log'});
    startLogDispatchTimer();

    _console.log.apply(_console,arguments);

};
window.console.info = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    console.__data__.messages.push({msg:args,action:'info'});
    startLogDispatchTimer();

    _console.info.apply(_console,arguments);
};

window.console.table = function () {
    _console.table.apply(_console,arguments);
};
window.console.dir = function () {
    _console.dir.apply(_console,arguments);
};
window.console.warn = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    console.__data__.messages.push({msg:args,action:'warn'});
    startLogDispatchTimer();

    var output = addLogStackNumber.apply(null,arguments);
    _console.warn.apply(_console,output);
};

window.console.error = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    console.__data__.messages.push({msg:args,action:'error'});
    startLogDispatchTimer();

    var output = addLogStackNumber.apply(null,arguments);
    _console.error.apply(_console,output);
};

document.addEventListener('Msg_LogNotificationExtension_received', function(e) {
    if (console.__data__.messages.length) {
        console.__data__.history.push(console.__data__.messages.shift());
        if (console.__data__.messages.length) {
            startLogDispatchTimer();
        }

    }
});

document.addEventListener('Msg_LogNotificationExtension_get_history', function(e) {
    if (console.__data__.history) {
        document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_history_found', {
          detail: JSON.stringify(console.__data__.history)
        }));
    }
});

window.alert = function() {
    // do something here
    var args = Array.prototype.slice.call(arguments, 0);
    
    console.__data__.messages.push({msg:args,action:'alert'});
    startLogDispatchTimer();

    _console.info.apply(_console,arguments);
};

// window.onerror = function(e, url, line) {
//     if (/Script error/.test(e)) {
//         console.__data__.messages.push({msg: 'unkown error: ' + e , action: 'unknown'});
//     } else {
//         console.__data__.messages.push({msg: 'error: ' + e , action: 'error'});
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
            console.__data__.messages.push({msg: 'unkown error: ' + detail.message , action: 'unknown'});
        } else {
            console.__data__.messages.push({msg: 'error: ' + detail.message , action: 'error'});
        }

        startLogDispatchTimer();
    }
});