/* NOTE: This is a generated file, please do not modify it, your changes will be lost */
var utils = require('../../../system/adaptor/adaptor.js')().utils;
var miso = require('../../../server/miso.util.js');
var myAdaptor = require('../flickr/flickr.adaptor.js')(utils);
module.exports = function(m){
	return {
'photos': function(){
	var args = Array.prototype.slice.call(arguments, 0),
		errResult,
		errFunc = function(){errResult=arguments; doneFunc()},
		successResult,
		successFunc = function(){successResult=arguments; doneFunc()},
		isReady = false,
		doneFunc = function(){isReady = true;};
	
	args.unshift(successFunc, errFunc);
	result = myAdaptor['photos'].apply(this, args);
	var bindScope = arguments.callee.caller;
	bindScope._misoReadyBinding = miso.readyBinderFactory();
	return { then: function(cb, err){
		doneFunc = bindScope._misoReadyBinding.bind(function(){
			if(errResult){
				err(errResult);
 			} else {
				cb(miso.response(successResult[0]));
			}
		});
		if(isReady){
			process.nextTick(doneFunc)
		}
	}};
}
	};
};