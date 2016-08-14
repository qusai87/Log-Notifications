// check the console for output and note that the line numbers in c
// odepen are not correct. It will be correct in your code!

var Debugger = function(gState, klass) {
  this.debug = {}
  if (!window.console) return function(){}
  if (gState && klass.isDebug) {
    for (var m in console)
      if (typeof console[m] == 'function')
        this.debug[m] = console[m].bind(window.console, klass.toString()+": ")
  }else{
    for (var m in console)
      if (typeof console[m] == 'function')
        this.debug[m] = function(){}
  }
  return this.debug
}

isDebug = true //global debug state

// we instantiate with the global switch and a ref to this for the local 
// this must have it's own isDebug defined for local controll
debug = Debugger(isDebug, this)

//log some stuff
debug.info('debug.log 1')
console.log('console.log on the next line!')
debug.info('notice this number is exactly 1 above the next')
console.log('told ya')
debug.info('it just works')

var MyClass = function() {
  this.isDebug = true //local state turn me off to see
  this.debug = Debugger(isDebug, this)
  this.debug.warn('It works in classses')
  debug.trace('hello trace')
}
MyClass.prototype.toString = function (){
    return 'MyClass'
}

var mc = new MyClass()





window.addEvent("domready", function () {
    // Option 1: Use the manifest:
    new FancySettings.initWithManifest(function (settings) {
        settings.manifest.myButton.addEvent("action", function () {
            alert("You clicked me!");
        });
    });
    
    // Option 2: Do everything manually:
    /*
    var settings = new FancySettings("My Extension", "icon.png");
    
    var username = settings.create({
        "tab": i18n.get("information"),
        "group": i18n.get("login"),
        "name": "username",
        "type": "text",
        "label": i18n.get("username"),
        "text": i18n.get("x-characters")
    });
    
    var password = settings.create({
        "tab": i18n.get("information"),
        "group": i18n.get("login"),
        "name": "password",
        "type": "text",
        "label": i18n.get("password"),
        "text": i18n.get("x-characters-pw"),
        "masked": true
    });
    
    var myDescription = settings.create({
        "tab": i18n.get("information"),
        "group": i18n.get("login"),
        "name": "myDescription",
        "type": "description",
        "text": i18n.get("description")
    });
    
    var myButton = settings.create({
        "tab": "Information",
        "group": "Logout",
        "name": "myButton",
        "type": "button",
        "label": "Disconnect:",
        "text": "Logout"
    });
    
    // ...
    
    myButton.addEvent("action", function () {
        alert("You clicked me!");
    });
    
    settings.align([
        username,
        password
    ]);
    */
});
