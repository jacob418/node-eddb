(function() {
	const path = require('path');
	const fs = require('fs');
	const mysql = require("mysql");

	var queryScheduler = function queryScheduler(config) {
		if(config.constructor !== {}.constructor){
			throw new Error("given parameter is not a valid JSON") ;
		}

		Object.defineProperty(this, "config", {
			enumerable: true,
			value: config,
			writable: false,
		}) ;

		var stack = {} ;

		var listeners = {} ;

		this.add = function add(stackName, query){
			if(!Array.isArray(stack[stackName])){
				stack[stackName] = [] ;
			}

			stack[stackName].push(query) ;

			checkStackSize() ;

			return stack[stackName].length ;
		} ;

		var checkStackSize = function checkStackSize(){
			var size = 0 ;

			for(var key in stack){
				size += stack[key].length ;
			}

			if(size >= config.maxStackSize){
				evtReady() ;
				if(size > config.maxStackSize){
					setTimeout(checkStackSize,100) ;
				}
			}
		} ;

		var evtError = function evtError(strError) {
			if(listeners.error.length > 0) {
				for (var i = 0; i < listeners.error.length; i++) {
					listeners.error[i](new Error(strError));
				}
			} else {
				throw new Error(strError) ;
			}
		} ;

		var evtReady = function evtReady() {
			var stackedQueries = [] ;

			if(listeners.ready.length > 0) {
				var notEmpty = false ;
				do {
					notEmpty = false ;
					for (var key in stack) {
						if (stack[key].length > 0) {
							stackedQueries.push(stack[key].pop());
							notEmpty = true ;
						}
					}
				} while(notEmpty && stackedQueries.length < config.maxStackSize) ;

				for (var i = 0; i < listeners.ready.length; i++) {
					listeners.ready[i](stackedQueries);
				}
			} else {
				evtError("missing ready function") ;
			}
		} ;

		this.readyNow = function(){
			evtReady() ;
		} ;

		this.on = function on(strEvt, cb){
			if(typeof cb !== "function"){
				throw new Error("parameter two has to be of type 'function'") ;
			}

			switch(strEvt){
				case "ready":
					if(!Array.isArray(listeners.ready)){
						listeners.ready = [] ;
					}
					listeners.ready.push(cb) ;
					break ;
				case "error":
					if(!Array.isArray(listeners.error)){
						listeners.error = [] ;
					}
					listeners.error.push(cb) ;
					break ;
				default:
					throw new Error("unknown event '" + strEvt + "'") ;
			}
		} ;
	};

	module.exports = function(config){return new queryScheduler(config) } ;
})() ;