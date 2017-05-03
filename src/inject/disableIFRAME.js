__DEBUG = false;

if (__DEBUG)
	console.log('disableIFRAME.js injected!');

window.__createElement = document.createElement;

document.createElement = function (name) {
  if (name!=='iframe') 
    return __createElement.apply(this,arguments);
  else 
    console.log('IFRAME DISABLED BY Mini JS Extension!');
}