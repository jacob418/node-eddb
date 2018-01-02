(function(){
	const path = require('path') ;
	const fs = require('fs') ;
	const mysql = require("mysql");
	const async = require("async") ;

	var databaseManager = function databaseManager(config){
		if(config.constructor !== {}.constructor){
			throw new Error("given parameter is not a valid JSON") ;
		}

		var query_cache = {} ;

		Object.defineProperty(this, "config", {
			enumerable: true,
			value: config,
			writable: false,
		}) ;

		this.loadQuery = function loadQuery(name, cb) {
			var fileName = path.join("./", this.config.queryDir ,name) ;
			if(typeof query_cache[fileName] === "string") {
				cb(null, query_cache[fileName]);
			}else{
				fs.readFile(fileName, 'utf8', function (err, content) {
					if (err) {
						cb(err);
					} else {
						query_cache[fileName] = content ;
						cb(null, content);
					}
				});
			}
		}
	} ;

	databaseManager.prototype.getConnection = function getConnection(cb, multiple) {
		multiple = !! multiple ;
		var connection = mysql.createConnection({
			host: this.config.host,
			user: this.config.user,
			password: this.config.pass,
			database: this.config.db,
			multipleStatements: multiple,
		});

		connection.connect(function (err) {
			if (err) {
				connection.end();
				cb(err);
			} else {
				cb(null, connection) ;
			}
		}) ;

	} ;

						}
	databaseManager.prototype.prepareQuery = function prepareQuery(name, data, cb){
		var queryFileName = name + '.sql' ;
		this.loadQuery(queryFileName,function(err, strQuery){
			if(err){
				cb(err) ;
			} else {
				strQuery = mysql.format(strQuery, data) ;
				cb(null, strQuery) ;
			}
		}.bind(this))
	} ;

	databaseManager.prototype.initDatabase = function initDatabase(cb){
		async.map(['createTables', 'fkCreate'], this.loadQuery, function(err, queries) {
			if(err){
				cb(err) ;
			} else {
				this.getConnection(function(err, connection){
					if(err){
						connection.end() ;
						cb(err) ;
					} else {
						async.mapSeries(queries, connection.query, function (err, results) {
							if (err) {
								cb(err);
							} else {
								var retResults = [];
								for (var i = 0; i < results.length; i++) {
									retResults.concat(results[i]);
								}
								cb(err, retResults);
							}
							connection.end() ;
						}) ;
					}
				});
			}
		}.bind(this));
	} ;

	module.exports = function(config){return new databaseManager(config)} ;
})() ;
