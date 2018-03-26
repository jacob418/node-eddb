(function() {
	const path = require('path');
	const fs = require('fs');
	const mysql = require("mysql");

	var taskScheduler = function taskScheduler(config) {
		if(config.constructor !== {}.constructor){
			throw new Error("given parameter is not a valid JSON") ;
		}

		Object.defineProperty(this, "config", {
			enumerable: true,
			value: config,
			writable: false,
		}) ;

		var listeners = {ready:[], error: []} ;

		var stack = [] ;
		
		var emptyTimeout = null ;

		this.add = function add(task){

			stack.push(task) ;

			checkStackSize() ;

			return stack.length ;
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

		var checkStackSize = function checkStackSize(){
			var size = stack.length ;
			
			if(emptyTimeout !== null){
				clearTimeout(emptyTimeout) ;
				emptyTimeout = null ;
			}
			
			if(stack.length >= config.maxStackSize){
				evtReady() ;
				if(stack.length > config.maxStackSize){
					setTimeout(checkStackSize.bind(this),100) ;
				} else if(stack.length > 0) {
					emptyTimeout = setTimeout(evtReady, config.maxWaitTime) ;
				}
			} else if(stack.length > 0) {
				emptyTimeout = setTimeout(evtReady, config.maxWaitTime) ;
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
			if(listeners.ready.length > 0) {
				var stagedTasks = [] ;
			
				while(stack.length > 0 && stagedTasks.length < config.maxStackSize) {
					stagedTasks.push(stack.pop());
				}

				for (var i = 0; i < listeners.ready.length; i++) {
					listeners.ready[i](stagedTasks);
				}
			} else {
				evtError("missing ready function") ;
			}
		} ;
	};

	module.exports = function(config){return new taskScheduler(config) } ;
})() ;