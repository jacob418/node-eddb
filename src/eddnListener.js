(function() {
	const zmq = require('zeromq') ;
	const zlib  = require('zlib') ;


	var eddnListener = function eddnListener(config){
		if(config.constructor !== {}.constructor){
			throw new Error("given parameter is not a valid JSON") ;
		}

		Object.defineProperty(this, "config", {
			enumerable: true,
			value: config,
			writable: false,
		}) ;

		var sock = null ;

		var listeners = {} ;

		this.listen = function listen() {
			if (!sock) {
				sock = zmq.socket('sub');
				sock.connect('tcp://eddn.edcd.io:9500');
				sock.subscribe('');

				console.log("listening") ;

				sock.on('message', function (message) {
					zlib.inflate(message, function (err, result) {
						result = JSON.parse(result.toString('utf8'));

						var schema = result.$schemaRef;
						var header = result.header;
						var content = result.message;

						if (schema === 'https://eddn.edcd.io/schemas/journal/1'
							&& content.event === "FSDJump"
							&& content.Population && content.Population > 0) {

							var data = {} ;
							data.name 				= content.StarSystem || "" ;
							data.rulingFaction 		= content.SystemFaction || null ;
							data.updatedAt		 	= parseInt(Date.parse(content.timestamp)/1000) ;
							data.security		 	= content.SystemSecurity || null ;
							data.state			 	= content.PowerplayState || "None" ;
							data.economy		 	= content.SystemEconomy  || "None" ;
							data.x				 	= content.StarPos[0] || 0 ;
							data.y				 	= content.StarPos[1] || 0 ;
							data.z				 	= content.StarPos[2] || 0 ;
							data.population		 	= content.Population || null ;
							data.power		 		= (Array.isArray(content.Powers) ? content.Powers[0] : null) ;
							data.powerState	 		= content.PowerplayState || null ;
							data.factions = [] ;
							var factionData = {} ;
							if(Array.isArray(content.Factions)) {
								for (var i = 0; i < content.Factions.length; i++) {
									factionData = {};
									factionData.name				= content.Factions[i].Name;
									factionData.allegiance			= content.Factions[i].Allegiance || null ;
									factionData.goverment			= content.Factions[i].Government || null ;
									factionData.influence			= content.Factions[i].Influence || null ;
									factionData.state				= content.Factions[i].FactionState || null ;
									factionData.recoveringState		= "None" ; // default value
									factionData.recoveringStates	= [] ;
									if (Array.isArray(content.Factions[i].RecoveringStates)) {
										var recoveringState = {};
										var maxTrend = -2 ;

										for (var j = 0; j < content.Factions[i].RecoveringStates.length; j++) {
											recoveringState = {};
											recoveringState.trend = content.Factions[i].RecoveringStates[j].Trend;
											recoveringState.state = content.Factions[i].RecoveringStates[j].State;
											factionData.recoveringStates.push(recoveringState);
											if(maxTrend < content.Factions[i].RecoveringStates[j].Trend){
												factionData.recoveringState = content.Factions[i].RecoveringStates[j].State ;
											}
										}
									}
									factionData.pendingState		= "None" ; // default value
									factionData.pendingStates 		= [];
									if (Array.isArray(content.Factions[i].PendingStates)) {
										var pendingState = {};
										var maxTrend = -2 ;

										for (var k = 0; k < content.Factions[i].PendingStates.length; k++) {
											pendingState = {};
											pendingState.trend = content.Factions[i].PendingStates[k].Trend;
											pendingState.state = content.Factions[i].PendingStates[k].State;
											factionData.pendingStates.push(pendingState);
											if(maxTrend < content.Factions[i].PendingStates[k].Trend){
												factionData.pendingState = content.Factions[i].PendingStates[k].State ;
											}
										}
									}
									data.factions.push(factionData);
								}
							}
							
							fireEvt('starSystem', data) ;
						}
					});
				});
			}
		} ;


		this.on = function on(evt, cb) {
			if(!listeners[evt] || !Array.isArray(listeners[evt])){
				listeners[evt] = [] ;
			}

			listeners[evt].push(cb) ;
		} ;

		var fireEvt = function(name, data){
			if(Array.isArray(listeners[name])){
				for(var i = 0; i < listeners[name].length; i++){
					if(typeof listeners[name][i] === "function"){
						listeners[name][i](data) ;
					}
				}
			}
		}
	} ;


	module.exports = function(config){return new eddnListener(config)} ;
})() ;