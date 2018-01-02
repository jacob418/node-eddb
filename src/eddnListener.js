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

		this.listen = function listen(cb) {
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

						if (schema === 'https://eddn.edcd.io/schemas/journal/1' && content.event === "FSDJump") {
							// process the data ....
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
	} ;


	module.exports = function(config){return new eddnListener(config)} ;
})() ;