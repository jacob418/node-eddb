(function(){
	const fs = require('fs') ;
	const mysql = require("mysql");

	var databaseManager = function databaseManager(config){
		if(config.constructor !== {}.constructor){
			throw new Error("given parameter is not a valid JSON") ;
		}

		Object.defineProperty(this, "config", {
			enumerable: true,
			value: config,
			writable: false,
		}) ;
	} ;

	databaseManager.prototype.initDatabase = function initDatabase(cb){
		fs.readFile('./sql/createTables.sql', 'utf8', function(err, query) {
			if(err){
				cb(err) ;
			} else {
				var error = null ;

				var connection = mysql.createConnection({
					host: this.config.host,
					user: this.config.user,
					password: this.config.pass,
					database: this.config.db,
					multipleStatements: true,
				});

				connection.on('error', function(err){
					error = err ;
				}) ;

				connection.connect(function(err){
					if(err || error !== null){
						if(err === null){
							err = error ;
						}

						cb(err) ;
					} else {
						// ....
					}
				});
			}
		}.bind(this));
	} ;

	module.exports = function(config){return new databaseManager(config)} ;
})() ;
