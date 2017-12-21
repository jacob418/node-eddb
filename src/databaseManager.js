(function(){
	var databaseManager = function databaseManager(config){
		if(config.constructor !== {}.constructor){
			throw new Error("given parameter is not a valid JSON") ;
		}

	} ;

	module.exports = databaseManager ;
})() ;