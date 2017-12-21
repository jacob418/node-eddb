(function(){
	var databaseManager = function databaseManager(config){
		if(config.constructor !== {}.constructor){
			throw new Error("given parameter is not a valid JSON") ;
		}

		Object.defineProperty(databaseManager.prototype, "config", {
			enumerable: true,
			value: config,
			writable: false,

		}) ;
	} ;

	module.exports = databaseManager ;
})() ;