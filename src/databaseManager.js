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

	databaseManager.prototype.initDatabase = function initDatabase(cb){
		async.map(['createTables', 'fkCreate'], this.loadQuery, function(err, queries) {
			if(err){
				cb(err) ;
			} else {
				this.getConnection(function(err, connection){
					if(err){
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
						}) ;
					}
				});
			}
		}.bind(this));
	} ;

	module.exports = function(config){return new databaseManager(config)} ;
})() ;
