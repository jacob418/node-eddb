CREATE TABLE starSystem (
	id							INT(11)		UNSIGNED	NOT NULL	PRIMARY KEY  AUTO_INCREMENT,
	controlSysId				INT(11)		UNSIGNED	NULL ,
	eddbId						INT(11)		UNSIGNED	NULL ,
	name 						VARCHAR(50)				NOT NULL ,
	x 							FLOAT(11,5)				NOT NULL ,
	y 							FLOAT(11,5)				NOT NULL ,
	z 							FLOAT(11,5)				NOT NULL ,
	population 					INT(10)		UNSIGNED	NOT NULL ,
	securityId 					INT(8)		UNSIGNED	NOT NULL ,
	economyId 					INT(8)		UNSIGNED	NOT NULL ,
	powerId						INT(8)		UNSIGNED	NULL ,
	powerStateId 				INT(8)		UNSIGNED	NULL ,
	updatedAt 					INT(11)		UNSIGNED	NOT NULL ,
	controllingMinorFactionId	INT(11)		UNSIGNED	NOT NULL ,
	UNIQUE INDEX(name)
) ;

CREATE TABLE minorFaction (
	id							INT(11)		UNSIGNED	NOT NULL	PRIMARY KEY	AUTO_INCREMENT ,
	name						VARCHAR(50)				NOT NULL ,
	governmentId				INT(8)		UNSIGNED	NOT NULL ,
	allegianceId				INT(8)		UNSIGNED	NOT NULL ,
	UNIQUE INDEX(name)
) ;

CREATE TABLE security (
	id							INT(8)		UNSIGNED	NOT NULL	PRIMARY KEY	AUTO_INCREMENT ,
	name						VARCHAR(50)				NOT NULL
) ;

CREATE TABLE allegiance (
	id							INT(8)		UNSIGNED	NOT NULL	PRIMARY KEY	AUTO_INCREMENT ,
	name						VARCHAR(50)				NOT NULL
) ;

CREATE TABLE government (
	id							INT(8)		UNSIGNED	NOT NULL	PRIMARY KEY	AUTO_INCREMENT ,
	name						VARCHAR(50)				NOT NULL
) ;

CREATE TABLE power (
	id							INT(8)		UNSIGNED	NOT NULL	PRIMARY KEY	AUTO_INCREMENT ,
	name						VARCHAR(50)				NOT NULL
) ;

CREATE TABLE economy (
	id							INT(8)		UNSIGNED	NOT NULL	PRIMARY KEY	AUTO_INCREMENT ,
	name						VARCHAR(50)				NOT NULL
) ;

CREATE TABLE factionState (
	id							INT(8)		UNSIGNED	NOT NULL	PRIMARY KEY	AUTO_INCREMENT ,
	name						VARCHAR(50)				NOT NULL
) ;

CREATE TABLE powerState (
	id							INT(8)		UNSIGNED	NOT NULL	PRIMARY KEY	AUTO_INCREMENT ,
	name						VARCHAR(50)				NOT NULL
) ;

CREATE TABLE starSystemHasMinorFaction(
	id					INT(11)		UNSIGNED	NOT NULL	AUTO_INCREMENT	PRIMARY KEY ,
	minorFactionId		INT(11)		UNSIGNED	NOT NULL ,
	starSystemId		INT(11)		UNSIGNED	NOT NULL ,
	stateId				INT(8)		UNSIGNED	NOT NULL ,
	pendingStateId		INT(8)		UNSIGNED	NULL ,
	recoveringStateId	INT(8)		UNSIGNED	NULL ,
	influence			FLOAT(7,4)	UNSIGNED	NOT NULL ,
	UNIQUE INDEX (minorFactionId, starSystemId)
) ;
