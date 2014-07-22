// Paulirish Log wrapper : http://www.paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
// 
GLOBALS = {};
GLOBALS.messages = [];
_console = console;

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
//return null;

Array.prototype.toString =  function() {
  return '[object Array]';
};



window.log = function(){
  log.history = log.history || [];   // store logs to an array for reference
  //log.history.push(arguments);
  /*if(this.console){
    console.log( Array.prototype.slice.call(arguments) );
  }*/

  // use old log
  //oldLog(Array.prototype.slice.call(arguments));
  //_console.info.call(_console,Array.prototype.slice.call(arguments).join(' '));
  console.info.apply(_console,arguments);
};

// Completelety overrride log console.
// http://stackoverflow.com/questions/7042611/override-console-log-for-production
// 

var console = shallowCopy(_console || {});
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
    //alert(args);
    GLOBALS.messages.push(args);
    //console.log('Sending message');
   
    setTimeout(function() {
        /* Example: Send data to your Chrome extension*/
        document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension', {
            detail: GLOBALS // Some variable from Gmail.
        }));
    }, 0);

    return _console.warn.apply(_console,arguments);

};

console.log = function(){
    var args = Array.prototype.slice.call(arguments, 0);
    //alert(args);
    GLOBALS.messages.push(args);
    //console.log('Sending message');
   
    /* Example: Send data to your Chrome extension*/
    document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension', {
        detail: GLOBALS // Some variable from Gmail.
    }));

    //var argumnetsWithColor = [];
    //argumnetsWithColor.unshift('color:red');
    //argumnetsWithColor.unshift('%css'/*+GLOBALS.message*/);
    //oldLog(argumnetsWithColor);
    /*if (GLOBALS.message == "[object Object]")
        console.dir.apply(null,args); 
    else*/ 
    if (args.join(' ') == "[object Array]")
       console.table.apply(null,args);
    else 
        _log.apply(null,args);
    // console.info('%c'+GLOBALS.message,'color:red')
    //console.info.call(this,argumnetsColorer)

};

/*
console.log = function() {
	
}.bind(console.log);*/

(function() {
  var proxied = console.log;
  window.alert = function() {
    // do something here
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift("[ALERT]");
    return proxied.apply(this, args);
  };
})();



var _log = (function (undefined) {
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
        // via @paulirish console wrapper
        //oldLog(args.join('\t\t\t\t\t\t\t\t\t\t\t\t'));
        window.log.apply(window.log,args);
        
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
        Log().write(Array.prototype.slice.call(arguments, 0)); // turn into proper array
    };//--  fn  returned

})();//--- _log*/