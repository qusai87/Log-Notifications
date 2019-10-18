$JSC = window.$JSC || {};

$JSC.__DEBUG = false;

if ($JSC.__DEBUG) {
    console.log('[EVALUATE::DEBUG] evaluate.js injected!');
}

$JSC.requests = [];

if (typeof jQuery === 'function' && jQuery.fn)
    $JSC.jQuery = jQuery;
else if (typeof require === 'function') {
    try {
        $JSC.jQuery = require('jquery');
    } catch (e) {

    }
}

$JSC.cookie = function(name) {
    if ($JSC.jQuery && $JSC.jQuery.cookie) {
        return $JSC.jQuery.cookie(name);
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
        if (i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value)
            return '[Circular]';

        if (i >= 50) // seems to be a harded maximum of 30 serialized objects?
            return '[Unknown]';

        ++i; // so we know we aren't using the original object anymore

        return value;
    }
}

document.addEventListener('Msg_LogNotificationExtension_evaluate_js_expression', function(e) {
    if ($JSC.__DEBUG) {
        $JSC._console.log('[EVALUATE::DEBUG] Msg_LogNotificationExtension_evaluate_js_expression: ', e);
    }
	if (e.detail && e.detail.id in $JSC.requests) {
		$JSC._console.log('found', e.detail);
	}

	$JSC.requests.push(e.detail.id);
    if ($JSC.__DEBUG)
        $JSC._console.log('[EVALUATE::DEBUG] evaluate_js_expression', e);
    var results = '';
    try {
        results = eval(e.detail.expression);
    } catch (err) {
        results = 'Error: ' + err.toString();
    }
    try {
        if (results && typeof results !== 'function') {
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_js_expression_found', {
                detail: {
                    expression: e.detail.expression,
                    results: JSON.stringify(results, censor(results))
                }
            }));
        } else {
            document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_js_expression_found', {
                detail: {
                    expression: e.detail.expression,
                    results: JSON.stringify(typeof results !== 'function' ? 'undefined' : 'Function')
                }
            }));
        }
    } catch (err) {
        document.dispatchEvent(new CustomEvent('Msg_LogNotificationExtension_js_expression_found', {
            detail: {
                expression: e.detail.expression,
                results: JSON.stringify('Error: ' + err.toString()),
            }
        }));
    }
});