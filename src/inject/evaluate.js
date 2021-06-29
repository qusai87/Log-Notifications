var __DEBUG = false;

$JSC = window.$JSC || {
    debuggerMode: false,
    enableStack: false,
};


(function ($JSC, console) {
    if (__DEBUG) {
        console.log('[EVALUATE::DEBUG] evaluate.js started!');
    }

    $JSC.requests = [];

    $JSC.useJQuery = false;

    if (typeof jQuery === 'function' && jQuery.fn) {
        $JSC.jQuery = jQuery;
        $JSC.useJQuery = true;
    } else if (typeof require === 'function') {
        try {
            $JSC.jQuery = require('jquery');
            $JSC.useJQuery = true;
        } catch (e) {
            if (__DEBUG)
                console.warn(e);
            // failed to load jQuery
        }
    }

    $JSC.cookie = function(name) {
        if ($JSC.useJQuery && $JSC.jQuery.cookie) {
            try {
                _cookie = $JSC.jQuery.cookie(name);
                return _cookie;
            } catch (e) {
                if (__DEBUG)
                    console.warn(e);
            }
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
        if (__DEBUG) {
            $JSC._console.log('[EVALUATE::DEBUG] Msg_LogNotificationExtension_evaluate_js_expression: ', e);
        }
    	if (e.detail && e.detail.id in $JSC.requests) {
    		$JSC._console.log('found', e.detail);
    	}

    	$JSC.requests.push(e.detail.id);
        if (__DEBUG)
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
}($JSC, window.console));