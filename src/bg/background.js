// Listener - Put this in the background script to listen to all the events.

//console.log('Message receiver');
//
//var messsages = [];
//if (localStorage["messsages"])
//  messsages = JSON.parse(localStorage["messsages"]);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    var msg = "";;
    for (var i=0;i<request.msg.length;i++)
      if (typeof request.msg[i] == "object")
        msg += "Object "+ JSON.stringify(request.msg[i])+" ";
      else
        msg += request.msg[i]+" ";

    console.log('message received: ',msg);
    
    chrome.notifications.create('', {
      type: "basic",
      title: "Log Notification",
      message: msg,
      iconUrl: "icons/icon.png"
    }, function () {

    });
    //esssages.push(request.msg);
    //chrome.alarms.create({delayInMinutes: 1});

    //console.log('Message received from ' + request.ext);
    sendResponse({ack:'received'}); // This send a response message to the requestor
});

//chrome.browserAction.setBadgeText({text: "ON2"});

chrome.runtime.onSuspend.addListener(function() {
  //chrome.browserAction.setBadgeText({text: "OFF"});
  //localStorage.messsages =  JSON.stringify(messsages);
});
/*
chrome.alarms.onAlarm.addListener(function() {
  var message = messsages.pop();
  console.log("message:",message);

  
  if (messsages.length)
    chrome.alarms.create({delayInMinutes: 1});
});*/