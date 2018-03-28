(function(){
	const path = require('path') ;
	const fs = require('fs') ;
	const mysql = require("mysql");
	const async = require("async") ;
	const taskScheduler = require("./taskScheduler") ;

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
		
		var scheduler = new taskScheduler({
			maxStackSize: config.maxQueriesPerConn,
			maxWaitTime: 500}) ;
		
		scheduler.on('ready', function(tasks){
			// push array contraining the task-array to prevent
			// async from pushing every task as single task for one worker
			q.push([tasks]) ;
		}) ;
		
		var q = async.queue(function(tasks, queueCb){
				this.getConnection(function(err, connection){
					if(err){
						for(var i = 0; i < tasks.length; i++){
							scheduler.add(tasks[i]) ;
						}
						queueCb(err) ;
					} else {
						var error = null ;
						async.eachLimit(tasks, config.maxQueriesParallel,
						function(task, eachCb){
							task(connection,eachCb) ;
						},
						function(err){
							connection.end() ;
							if(err){
								queueCb(err) ;
							} else {
								queueCb() ;
							}
						}) ;
					}
					
				}) ;
		}.bind(this), config.maxConnAmount) ;
		
		this.query = function query(sql, data, cb){
			if(!Array.isArray(data)){
				data = [] ;
			}

			var task = function(connection,taskCb){
				connection.query(sql, data, function(err, result, fields){
					if(err){
						cb(err) ;
					} else {
						cb(null, result, fields) ;
					}
					// inform task-runner that the task has finished
					taskCb() ;
				}) ;
			};
			scheduler.add(task) ;
		} ;

		this.loadQuery = function loadQuery(name, cb) {
			var fileName = path.join("./", config.queryDir ,name) + ".sql" ;
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

	databaseManager.prototype.massInsert = function massInsert(queries, cb) {
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
		var queryFileName = name ;
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
						//connection.end() ;
						cb(err) ;
					} else {
						async.mapSeries(queries, function(query, mapSeriesCb){
							connection.query(query, [], mapSeriesCb) ;
						}, function (err, results) {
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
						}.bind(this)) ;
					}
				}.bind(this), true);
			}
		}.bind(this));
	} ;

	databaseManager.prototype.getId = function getId(type ,name, cb){
		if(name === undefined)
			throw new Error() ;
		if(name === null){
			cb(null, null) ;
		} else {
			var querySelect = "SELECT * FROM " + type + " WHERE name = ? LIMIT 1;";
			var queryInsert = "INSERT INTO " + type + " SET name = ?;";
			var value = this.getCache(type, name);
			if (value === null) {
				this.setCache(type, name, 0);
				async.waterfall([
					function (waterfallCb) {
						this.query(querySelect, [name], function(err, result){
							waterfallCb(err, result);
						});
					}.bind(this),
					function (result, waterfallCb) {
						if (result.length === 1) {
							waterfallCb(null, [], parseInt(result[0].id));
						} else {
							this.query(queryInsert, [name], function(err, result){
								waterfallCb(err, result, NaN);
							});
						}
					}.bind(this),
					function (result, id, waterfallCb) {
						if (!isNaN(id)) {
							waterfallCb(null, id);
						} else {
							waterfallCb(null, result.insertId);
						}
					}.bind(this)
				], function (err, id) {
					if (err) {
						cb(err);
					} else {
						this.setCache(type, name, id);
						cb(null, id);
					}
				}.bind(this));
			}else if(value === 0){
				var retryCnt = 0 ;
				async.whilst(
					function() { return this.getCache(type, name) === 0 ; }.bind(this),
					function(callback) {
						retryCnt++ ;
						if(retryCnt > 500){
							this.setCache(type, name, null) ;
							callback(new Error('max retry count reached'));
						} else {
							setTimeout(function () {
								callback(null);
							}, 250);
						}
					}.bind(this),
					function (err) {
						cb(err, this.getCache(type, name)) ;
					}.bind(this));
			} else {
				cb(null, value);
			}
		}
	} ;

	databaseManager.prototype.getSecurityId = function getSecurityId(name, cb){
		this.getId('security', name, cb) ;
	} ;

	databaseManager.prototype.getGovernmentId = function getGovernmentId(name, cb){
		this.getId('government', name, cb) ;
	} ;

	databaseManager.prototype.getAllegianceId = function getAllegianceId(name, cb){
		this.getId('allegiance', name, cb) ;
	} ;

	databaseManager.prototype.getPowerId = function getPowerId(name, cb){
		this.getId('power', name, cb) ;
	} ;

	databaseManager.prototype.getFactionId = function getFactionId(name, govId, allegId, cb){
		var querySelect = "SELECT * FROM minorFaction WHERE name = ? LIMIT 1;" ;
		var queryInsert = "INSERT INTO minorFaction SET name = ?, governmentId = ?, allegianceId = ?;" ;
		var value = this.getCache("minorFaction", name) ;
		if(value == null){
			this.setCache("minorFaction", name, 0) ;
			async.waterfall([
				function(waterfallCb){
					this.query(querySelect, [name], function(err, result){
						waterfallCb(err, result) ;
					}) ;
				}.bind(this),
				function(result, waterfallCb){
					if(result.length === 1){
						waterfallCb(null, [], parseInt(result[0].id)) ;
					}else{
						this.query(queryInsert, [name, govId, allegId], function(err, result){
							waterfallCb(err, result, NaN) ;
						}) ;
					}
				}.bind(this),
				function(result, id, waterfallCb){
					if(!isNaN(id)){
						waterfallCb(null, id) ;
					} else {
						waterfallCb(null, result.insertId) ;
					}
				}
			], function(err, id){
				if(err){
					cb(err) ;
				} else {
					this.setCache("minorFaction", name, id) ;
					cb(null, id) ;
				}
			}.bind(this)) ;
		}else if(value === 0){
			var retryCnt = 0 ;
			async.whilst(
				function() { return this.getCache("minorFaction", name) === 0 ; }.bind(this),
				function(callback) {
					retryCnt++ ;
					if(retryCnt > 500){
						this.setCache("minorFaction", name, null) ;
						callback(new Error('max retry count reached'));
					} else {
						setTimeout(function () {
							callback(null);
						}, 250);
					}
				}.bind(this),
				function (err) {
					cb(err, this.getCache("minorFaction", name)) ;
				}.bind(this));
		}else{
			cb(null, value) ;
		}
	} ;

	databaseManager.prototype.getEconomyId = function getEconomyId(name, cb){
		this.getId('economy', name, cb) ;
	} ;

	databaseManager.prototype.getFactionStateId = function getFactionStateId(name, cb){
		this.getId('factionState', name, cb) ;
	} ;

	databaseManager.prototype.getPowerStateId = function getPowerStateId(name, cb){
		this.getId('powerState', name, cb) ;
	} ;

	databaseManager.prototype.getStarSystem = function getStarSystem(name, cb){
		var querySystem = "SELECT * FROM starSystem WHERE name = ? LIMIT 1;" ;
		var queryFactions = "SELECT x.*, f.name AS factionName FROM starSystemHasMinorFaction x LEFT JOIN minorFaction f ON f.id = x.minorFactionId WHERE starSystemId = ?;" ;
		this.query(querySystem, [name], function(err, resultSystem, fields){
			if(err){
				cb(err) ;
			} else {
				if(resultSystem.length === 1) {
					resultSystem = resultSystem[0] ;
					var data = {} ;
					data.id					= resultSystem.id ;
					data.controlSysId		= resultSystem.controlSysId ;
					data.name 				= resultSystem.name ;
					data.rulingFactionId	= resultSystem.rulingMinorFactionId ;
					data.updatedAt		 	= resultSystem.updatedAt ;
					data.security		 	= resultSystem.securityId ;
					data.state			 	= resultSystem.powerStateId ;
					data.economy		 	= resultSystem.economyId ;
					data.x				 	= resultSystem.x ;
					data.y				 	= resultSystem.y ;
					data.z				 	= resultSystem.z ;
					data.population		 	= resultSystem.population ;
					data.factions			= [] ;

					this.query(queryFactions, [resultSystem.id], function(err, resultFaction, fields){
						if(err) {
							cb(err) ;
						} else {

							if(!Array.isArray(resultFaction)){
								resultFaction = [resultFaction] ;

							}
							var factionData = {};
							for (var i = 0; i < resultFaction.length; i++) {
								factionData = {};
								factionData.name = resultFaction[i].name ;
								factionData.minorFactionId = resultFaction[i].minorFactionId ;
								factionData.influence = resultFaction[i].influence ;
								factionData.stateId = resultFaction[i].stateId ;
								factionData.recoveringStateId = resultFaction[i].recoveringStateId ;
								factionData.pendingStateId = resultFaction[i].pendingStateId ;

								data.factions.push(factionData) ;
							}

							cb(null, data) ;
						}
					}) ;
				} else {
					cb(null, {}) ;
				}
			}
		}.bind(this)) ;
	} ;


	databaseManager.prototype.updateStarSystem = function updateStarSystem(data, cb) {
		this.getStarSystem(data.name, function(err, system){
			if(err){
				cb(err) ;
			} else {
				system.name = data.name;
				system.x = data.x;
				system.y = data.y;
				system.z = data.z;
				system.population = data.population;
				system.state = data.state;
				system.power = data.power;
				system.economy = data.economy;
				system.security = data.security;
				system.updatedAt = data.updatedAt;
				system.rulingFaction = data.rulingFaction;

				if (!Array.isArray(system.factions)) {
					system.factions = [];
				}


				for (var i = 0; i < data.factions.length; i++) {
					var found = system.factions.findIndex(function (el) {
						return el.name === data.factions[i].name;
					});

					if (found > -1) {
						system.factions[found] = data.factions[i];
					} else {
						system.factions.push(data.factions[i]);
					}
				}

				// delete factions that are not present anymore
				for (var i = 0; i < system.factions.length; i++) {
					var found = data.factions.find(function (el) {
						return el.name === system.factions[i].name;
					});
					if (!found) {

						system.factions.splice(i, 1);
						i--;	// reduce index by 1 to avoid unintended skipping of elements
					}
				}

				// remove 'Pilots Federation Local Branch' since it has no influence
				for(var a = 0; a < system.factions.length; a++) {
					if(system.factions[a].influence === null) {
						system.factions[a].influence = 0 ;
						//system.factions.splice(a, 1);
						//a--;	// reduce index by 1 to avoid unintended skipping of elements
					}
				}

				async.parallel({
					powerStateId: function (parallelCb) {
						this.getPowerStateId(system.state, parallelCb);
					}.bind(this),
					economyId: function (parallelCb) {
						this.getEconomyId(system.economy, parallelCb);
					}.bind(this),
					securityId: function (parallelCb) {
						this.getSecurityId(system.security, parallelCb);
					}.bind(this),
					powerId: function (parallelCb) {
						this.getPowerId(system.power, parallelCb);
					}.bind(this)
				}, function (err, results) {
					if (err) {
						cb(err);
					} else {
						system.securityId = results.securityId;
						system.economyId = results.economyId;
						system.powerId = results.powerId;
						system.powerStateId = results.powerStateId;


						async.eachOf(system.factions, function (faction, key, eachOfCb) {
							async.parallel({
								allegianceId: function (parallelCb) {
									this.getAllegianceId(faction.allegiance, parallelCb);
								}.bind(this),
								govermentId: function (parallelCb) {
									this.getGovernmentId(faction.goverment, parallelCb);
								}.bind(this),
								stateId: function (parallelCb) {
									this.getFactionStateId(faction.state, parallelCb);
								}.bind(this),
								recoveringStateId: function (parallelCb) {
									this.getFactionStateId(faction.recoveringState, parallelCb);
								}.bind(this),
								pendingStateId: function (parallelCb) {
									this.getFactionStateId(faction.pendingState, parallelCb);
								}.bind(this)
							}, function (err, results) {
								if (err) {
									eachOfCb(err);
								} else {
									this.getFactionId(faction.name,
										results.govermentId,
										results.allegianceId,
										function (err, id) {
											if (err) {
												eachOfCb(err);
											} else {
												system.factions[key].factionId = id;
												system.factions[key].govermentId = results.govermentId;
												system.factions[key].allegianceId = results.allegianceId;
												system.factions[key].stateId = results.stateId;
												system.factions[key].recoveringStateId = results.recoveringStateId;
												system.factions[key].pendingStateId = results.pendingStateId;


												if (system.rulingFaction === faction.name) {
													system.rulingFactionId = id;
												}

												eachOfCb(null);
											}
										});
								}
							}.bind(this));
						}.bind(this), function (err) {
							if (err) {
								cb(err);
							} else {
								this.saveStarSystem(system, cb);
							}
						}.bind(this));
					}
				}.bind(this));
			}
		}.bind(this)) ;
	} ;

	databaseManager.prototype.saveStarSystem = function saveStarSystem(data, cb) {
		async.waterfall([
			function(waterfallCb){
				var queryFile = 'starSystemUpdate' ;
				var queryData = [
					data.population,
					data.securityId,
					data.economyId,
					data.powerId,
					data.powerStateId,
					data.updatedAt,
					data.rulingFactionId,
					data.id
				] ;
				if(isNaN(parseInt(data.id))) {
					queryFile = 'starSystemInsert' ;
					queryData = [
						data.name,
						data.x, data.y, data.z,
						data.population,
						data.securityId,
						data.economyId,
						data.powerId,
						data.powerStateId,
						data.updatedAt,
						data.rulingFactionId
					] ;
				}

				this.loadQuery(queryFile, function(err, sql) {
					if (err) {
						waterfallCb(err);
					} else {
						this.query(sql, queryData, function (err, result, fields) {
							if (err) {
								waterfallCb(err);
							} else {
								if(isNaN(parseInt(data.id))) {
									data.id = result.insertId;
								}

								waterfallCb(null, data) ;
							}
						});
					}
				}.bind(this)) ;
			}.bind(this),
			function(data, waterfallCb){
				async.eachOf(data.factions, function(faction, key, eachCb){
					this.loadQuery('starSystemFactionInsertUpdate', function(err, sql) {
						if(err){
							eachCb(err) ;
						} else {
							this.query(sql,
									  [
									  	  faction.factionId,
										  data.id,
										  faction.stateId,
										  faction.pendingStateId,
										  faction.recoveringStateId,
										  faction.influence,
										  faction.stateId,
										  faction.pendingStateId,
										  faction.recoveringStateId,
										  faction.influence
									  ],
									  function (err, result, fields) {
								if (err) {
									eachCb(err);
								} else {
									data.factions[key].id = result.insertId ;
									eachCb(null) ;
								}
							});
						}
					}.bind(this)) ;
				}.bind(this), function(err){
					if(err){
						waterfallCb(err) ;
					} else {
						waterfallCb(null, data) ;
					}
				}) ;
			}.bind(this),
			function(data, waterfallCb){
				var knownFactions = [] ;
				for(var i = 0; i < data.factions.length; i++){
					knownFactions.push(data.factions.id) ;
				}

				this.query('DELETE FROM starSystemHasMinorFaction WHERE minorFactionId NOT IN (?) AND starSystemId = ?',
						   [knownFactions, data.id],
						   function(err, result, fields){
					if(err){
						waterfallCb(err) ;
					} else {
						waterfallCb(null, data) ;
					}
				}) ;
			}.bind(this)
		],function(err, data){
			if(err){
				cb(err) ;
			} else {
				cb(null, data) ;
			}
		}) ;
	} ;


	module.exports = function(config){return new databaseManager(config)} ;
})() ;
