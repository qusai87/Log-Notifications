__DEBUG = false;

if (__DEBUG)
	console.log('disableIFRAME.js injected!');



var __createElement = document.createElement;
var __eval = window.eval;

document.createElement = function (name) {
  if (name!=='iframe') 
    return __createElement.apply(this,arguments);
  else 
    console.log('IFRAME DISABLED BY Mini JS Extension!');
}

window.eval = function (name) {
  if (name.indexOf('open')!==-1 || name.indexOf('window')!==-1 || name.indexOf('script')!=-1) {
    console.log('EVAL DISABLED BY Mini JS Extension!');
    return;
  }
  else {
    return __eval.apply(this,arguments);
  }
}