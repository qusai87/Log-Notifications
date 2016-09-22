var DEBUG = false;

if (DEBUG)
	console.log('evaluate.js injected!');

window._JSConsole = window._JSConsole || {};

if (typeof jQuery === 'function' && jQuery.fn)
    window._JSConsole.jQuery = jQuery;
else if (typeof require === 'function') {
    try {
        window._JSConsole.jQuery = require('jquery');
    } catch (e) {
        
    }
}

window._JSConsole.cookie = function(name) {
  if (window._JSConsole.jQuery && window._JSConsole.jQuery.cookie) {
    return window._JSConsole.jQuery.cookie(name);
  }
  
	var cookies = {};
	var c = document.cookie.split(';');

	for (var i = c.length - 1; i >= 0; i--) {
		var C = c[i].split('=');
		cookies[C[0].trim()] = decodeURIComponent(C[1]);
	}
	if (name) {
		return cookies[name];
	}
	return cookies;
}

function censor(censor) {
  var i = 0;

  return function(key, value) {
    if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value) 
      return '[Circular]'; 

    if(i >= 50) // seems to be a harded maximum of 30 serialized objects?
      return '[Unknown]';

    ++i; // so we know we aren't using the original object anymore

    return value;  
  }
}

document.addEventListener('Msg_LogNotificationExtension_evaluate_js_expression', function(e) {
    if (DEBUG)
        console.log(e);
    var results = '';
    try {
        results = eval(e.detail);
    } catch (err) {
        results = 'Error: '+err.toString();
    }
    try {
        if (results && typeof results !=='function') {
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_js_expression_found', {
              detail: {  
                expression : e.detail,
                results:JSON.stringify(results,censor(results))
              }
            }));
        } else {
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_js_expression_found', {
              detail: {  
                expression : e.detail,
                results:JSON.stringify(typeof results !=='function' ? 'undefined': 'Function')
              }
            }));
        }
    } catch (err) {
        document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_js_expression_found', {
          detail: {
            expression : e.detail,
            results: JSON.stringify('Error: '+err.toString()),
          }
        }));
    }
});