// Listener - Put this in the background script to listen to all the events.

//console.log('Message receiver');
//

localStorage.quoue = [];

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    chrome.notifications.create("test", {
      type: "basic",
      title: "Log Notification",
      message: request.msg,
      iconUrl: "icons/icon.png"
    }, function () {

    });
    
    //console.log('Message received from ' + request.ext);
    sendResponse({ack:'received'}); // This send a response message to the requestor
});

chrome.browserAction.setBadgeText({text: "ON2"});

chrome.runtime.onSuspend.addListener(function() {
  chrome.browserAction.setBadgeText({text: "OFF"});
});