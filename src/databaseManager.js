(function(){
	const path = require('path') ;
	const fs = require('fs') ;
	const mysql = require("mysql");
	const async = require("async") ;
	const taskScheduler = require("./src/taskScheduler") ;

	var databaseManager = function databaseManager(config){
		if(config.constructor !== {}.constructor){
			throw new Error("given parameter is not a valid JSON") ;
		}

		var query_cache = {} ;

		var cache = {} ;

		Object.defineProperty(this, "config", {
			enumerable: true,
			value: config,
			writable: false,
		}) ;
		
		var scheduler = new taskScheduler({maxStackSize: this.config.maxQueriesPerConn, maxWaitTime: 500}) ;
		
		scheduler.on('ready', function(tasks){
			// push array contraining the task-array to prevent
			// async from pushing every task as single task for one worker
			q.push([tasks]) ;
		}) ;
		
		var q = async.queue(function(tasks, queueCb){
				this.getConnection(function(err, connection){
					if(err){
						for(var i = 0; i < tasks.length; i++){
							tasks[i].cb(err) ;
						}
					} else {
						var error = null ;
						async.eachLimit(tasks, this.config.maxQueriesParallel,
						function(task, eachCb){
							task(connection,eachCb) ;
						},
						function(err){
							if(err){
								queueCb(err) ;
							} else {
								queueCb() ;
							}
						}) ;
					}
					
				}) ;
		}, this.config.maxConnAmount) ;
		
		this.query = function query(sql ,data , cb){
			var task = function(connection,taskCb){
				caonnection.query(sql, data, function(err, result, fields){
					if(err){
						cb(err) ;
					} else {
						cb(null, result, fields) ;
					}
					// inform task-runner that the task has finished
					taskCb() ;
				}) ;
			};
			sheduler.add(task) ;
		} ;

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
		} ;

		this.getCache = function getCache(name, key){
			var val = null ;

			if(cache.hasOwnProperty(name)){
				if(cache[name].hasOwnProperty(key)){
					val = cache[name][key] ;
				}
			}

			return val ;
		} ;

		this.setCache = function setCache(name, key, value){
			if(!cache.hasOwnProperty(name)){
				cache[name] = {} ;
			}

			cache[name][key] = value ;
		} ;
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

	databaseManager.prototype.runQuerys = function runQueries(queries, cb) {
		var results = [] ;

		// start up 'this.config.maxConnAmount' connections in parallel
		async.times(this.config.maxConnAmount, function(n, timesCb) {
			// as long as queries are left start a connection and process them
			async.whilst(function () {return (queries.length > 0);},
				function (whilstCb) {
					this.getConnection(function(err, connection) {
						if (err) {
							whilstCb(err);
						} else {
							const startTime = Date.now().valueOf();
							var error = null ;
							var stop = false ;

							// create a queue, running up to five queries in parallel
							var q = async.queue(function(task, queueCb){
								connection.query(task, [], function (err, result) {
									if(err) {
										stop = true ;
										error = err ;
										// bring query back to list in order to prevent data loss
										queries.push(task) ;
									} else {
										results.push(result);
									}
									queueCb() ;
								}.bind(this)) ;
							}.bind(this), 5);

							// pause working until setup is complete
							q.pause() ;

							// don not store more than 10 tasks in queue
							q.buffer = 10;

							// if space is in buffer and time limit is not reached add a query to the queue
							q.unsaturated = function () {
								var currentTime = Date.now().valueOf();
								if (startTime + this.config.maxConnDuration > currentTime && queries.length > 0 && !stop) {
									q.push(queries.pop());
								}
							}.bind(this);

							// if time limit is reached or no queries are left end, otherwise add a new query
							q.drain = function () {
								var currentTime = Date.now().valueOf();
								if (startTime + this.config.maxConnDuration < currentTime || !(queries.length > 0)) {
									stop = true ;

									connection.end();
									whilstCb(error);
								} else {
									q.push(queries.pop());
								}
							}.bind(this) ;

							// add initial query if possible and start working
							if(queries.length > 0) {
								q.push(queries.pop());
								q.resume();
							}else{
								connection.end();
								whilstCb(null);
							}
						}
					}.bind(this));
				}.bind(this),
				function (err) {
					if (err) {
						timesCb(err);
					} else {
						timesCb(null);
					}
				});
		}.bind(this), function(err){
			if(err){
				cb(err) ;
			} else {
				cb(null, results) ;
			}
		}.bind(this)) ;
	} ;

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

	databaseManager.prototype.getId = function getId(type ,name, cb){
		var querySelect = "SELECT * FROM " + type + " WHERE name = ? LIMIT 1;" ;
		var queryInsert = "INSERT INTO " + type + " name = ?;" ;
		var value = this.getCache(type, name) ;
		if(value == null){
			this.getConnection(function(err,connection){
				if(err){
					cb(err) ;
				} else {
					async.waterfall([
						function(waterfallCb){
							connection.query(querySelect, [name], waterfallCb) ;
						},
						function(result, fields, waterfallCb){
							if(result.affectedRows === 1){
								waterfallCb(null, [], null, parseInt(result.id)) ;
							}else{
								connection.query(queryInsert, [name], waterfallCb) ;
							}
						},
						function(result, fields, id, waterfallCb){
							if(!isNaN(id)){
								waterfallCb(id) ;
							} else {
								waterfallCb(result.insertId) ;
							}
						}
					], function(err, id){
						if(err){
							cb(err) ;
						} else {
							this.setCache(type, name, id) ;
							cb(null, id) ;
						}
					}) ;
				}
			}) ;
		}else{
			cb(null, value) ;
		}
	} ;

	databaseManager.prototype.getSecurityId = function getSecurityId(name, cb){
		this.getId('security', name, cb) ;
	} ;
	module.exports = function(config){return new databaseManager(config)} ;
})() ;
