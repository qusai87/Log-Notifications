// Paulirish Log wrapper : http://www.paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
// 

_console = console;
console.log('Log notifications v.0.8');

// shallow copy object, thanks to http://geniuscarrier.com/copy-object-in-javascript/
function shallowCopy(oldObj) {
    var newObj = {};
    for(var i in oldObj) {
        //if(oldObj.hasOwnProperty(i)) {
            newObj[i] = oldObj[i];
        //}
    }
    return newObj;
}
Array.prototype.toString =  function() {
  return '[object Array]';
};

// Completelety overrride log console.
// http://stackoverflow.com/questions/7042611/override-console-log-for-production
// 

var console = shallowCopy(_console || {});
console.GLOBALS = {};
console.GLOBALS.messages = [];
console.GLOBALS.dispatchTimer = -1;

console.addLogStackNumber = (function (undefined) {
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

console.log = function(){
    var args = Array.prototype.slice.call(arguments, 0);
    //alert(args);
    console.GLOBALS.messages.push(args);
    console.startLogDispatchTimer();
    //var argumnetsWithColor = [];
    //argumnetsWithColor.unshift('color:red');
    //argumnetsWithColor.unshift('%css'/*+GLOBALS.message*/);
    //oldLog(argumnetsWithColor);
    /*if (GLOBALS.message == "[object Object]")
        console.dir.apply(null,args); 
    else*/ 
    if (args.join(' ') == "[object Array]")
       console.table.apply(null,args);
    else {
        var output = console.addLogStackNumber.apply(null,args);
        console.info.apply(null,output);
    }
    // console.info('%c'+GLOBALS.message,'color:red')
    //console.info.call(this,argumnetsColorer)

};
console.info = function () {
    return _console.info.apply(_console,arguments);
};

console.table = function () {
    return _console.table.apply(_console,arguments);
};
console.dir = function () {
    return _console.dir.apply(_console,arguments);
};
console.warn = function () {
    var args = Array.prototype.slice.call(arguments, 0);

    console.GLOBALS.messages.push(args);
    console.startLogDispatchTimer();
     var output = console.addLogStackNumber.apply(null,arguments);
    return _console.warn.apply(_console,output);

};
console.startLogDispatchTimer = function () {
    if (console.GLOBALS &&  console.GLOBALS.dispatchTimer == -1) {
        console.GLOBALS.dispatchTimer = setTimeout(function () {
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension', {
              detail: console.GLOBALS
            }));
            console.GLOBALS.dispatchTimer = -1;
        },50);
    }
}

document.addEventListener('Msg_LogNotificationExtension', function(e) {
    if (console.GLOBALS.messages.length) {
        console.GLOBALS.messages.shift();
        if (console.GLOBALS.messages.length) {
            console.GLOBALS.dispatchTimer = -1;
            console.startLogDispatchTimer();
        }

    }
});
/*
console.log = function() {
	
}.bind(console.log);*/

/*(function() {
  var proxied = console.log;
  window.alert = function() {
    // do something here
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift("[ALERT]");
    return proxied.apply(this, args);
  };
})();*/

window.alert = function() {
    // do something here
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift("[ALERT]");
    return console.log.apply(this, args);
  };