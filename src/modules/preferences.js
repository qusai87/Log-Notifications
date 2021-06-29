var __DEBUG = false;

export const USER_PREFERENCES_KEY = 'userPreferencesStorage'
export const DOMAIN_KEY = 'Domains';

export const UserPreferencesKeys = {
    SHOW_INFO: 'showInfo',
    SHOW_LOGS: 'showLogs',
    ENABLE_LOG_STACK: 'enableStack',
    DISABLE_CACHE: 'disableCache',
    IS_ACTIVE: 'isActive',
    SHOW_ALERTS: 'showAlerts',
    SHOW_ERRORS: 'showErrors',
    SHOW_WARNINGS: 'showWarnings',
    PRESERVE_LOGS: 'preserveLogs',
    SHOW_NOTIFICATIONS: 'showNotifications',
    DOMAIN_PREFRENCES: {
        EXCLUDE_ERRORS: 'excludeErrors',
        EXCLUDE_WARNINGS: 'excludeWarnings',
        EXCLUDE_LOGS: 'excludeLogs',
        EXCLUDE_INFO: 'excludeInfo',
        DISABLE_STYLES: 'disableStyles',
        FILTERS_INCLUDED: 'includedFilter',
        FILTERS_EXCLUDED: 'excludedFilter',
    },
}


export const DEFAULT_DOMAIN_PREFERENCES = {
    'excludeErrors': false,
    'excludeWarnings': false,
    'excludeLogs': false,
    'excludeInfo': false,
    'disableStyles': false,
    'showNotifications': false,
    'includedFilter': '',
    'excludedFilter': '',

}

var LOCALHOST_DOMAIN_PREFERENCES = {
    'showNotifications': false,
    'excludeErrors': false,
    'excludeWarnings': false,
    'excludeLogs': false,
    'excludeInfo': false,
    'disableStyles': false,
    'includedFilter': '',
    'excludedFilter': '',
}

var userPreferences = {
    'isActive': true,
    'showInfo': false,
    'showLogs': false,
    'showAlerts': false,
    'showErrors': false,
    'showWarnings': false,
    'enableStack': false,
    'disableCache': false,
    'preserveLogs': false,
    'showNotifications': false,
    'Domains': {
        'localhost': LOCALHOST_DOMAIN_PREFERENCES
    },
};


var domain;


function get(name) {
    return userPreferences;
}

function set(newUserPreferences) {
    userPreferences = newUserPreferences;
}

function getPreferenceForDomain(name, _domain) {

    if (_domain) {
        if (userPreferences[DOMAIN_KEY] && userPreferences[DOMAIN_KEY][_domain]) {
            return userPreferences[DOMAIN_KEY][_domain][name];
        }    
    } else {
        if (domain && userPreferences[DOMAIN_KEY] && userPreferences[DOMAIN_KEY][domain]) {
            return userPreferences[DOMAIN_KEY][domain][name];
        }
    }
    return null;
}

function getPreference(name) {
    return null || userPreferences[name] ;
}

function setPreference(name, value) {
    if (__DEBUG) {
        console.log('[PREFERENCES::DEBUG] setPreference called', 'name:', name, 'value:', value);
    }
    userPreferences[name] = value;
    sync();
}

function setPreferenceForDomain(name, value) {
    if (__DEBUG) {
        console.log('[PREFERENCES::DEBUG] setPreferenceForDomain called', 'name:', name, 'value:', value);
    }
    if (domain) {
        if (!userPreferences[DOMAIN_KEY][domain]) {
            userPreferences[DOMAIN_KEY][domain] = {};
        }
        userPreferences[DOMAIN_KEY][domain][name] = value;
        sync();
    } else {
        if (__DEBUG) {
            console.warn('[PREFERENCES::DEBUG] failed to set Preferences', 'domain:', domain, 'preference:', name, 'value:', value);
        }
    }
}

function load(callback) {
    if (__DEBUG)
        console.log('[PREFERENCES::DEBUG] load called');

    chrome.storage.sync.get(USER_PREFERENCES_KEY, function(data) {
        if (__DEBUG)
            console.log('[PREFERENCES::DEBUG] User Preferences loaded!', data);
        var success = false;
        if (data[USER_PREFERENCES_KEY]) {
            // override global variable
            userPreferences = data[USER_PREFERENCES_KEY]; 
            success = true;
        }
        if (typeof callback == 'function') {
            callback(success);
        }
    });
}
function sync() {
    if (__DEBUG) {
        console.log('[PREFERENCES::DEBUG] sync called');
    }
    var data  = {};
    data[USER_PREFERENCES_KEY] = userPreferences;

    chrome.storage.sync.set(data);
}

function setDomain(newDomain) {
    domain = newDomain;
}

var Preferences = {
    get,
    set,
    load,
    sync,
    setDomain,
    getPreference,
    setPreference,
    getPreferenceForDomain,
    setPreferenceForDomain,
}

export default Preferences;