CREATE TABLE starSystem (
	id							INT(11)		UNSIGNED	NOT NULL	PRIMARY KEY ,
	edsmId 						INT(11)		UNSIGNED	NOT NULL ,
	name 						VARCHAR(50)				NOT NULL ,
	x 							FLOAT(11,5)				NOT NULL ,
	y 							FLOAT(11,5)				NOT NULL ,
	z 							FLOAT(11,5)				NOT NULL ,
	population 					INT(8)		UNSIGNED	NOT NULL ,
	isPopulated 				CHAR(1)					NOT NULL	DEFAULT '1' ,
	governmentId 				INT(8)		UNSIGNED	NOT NULL ,
	government 					VARCHAR(25)				NOT NULL ,
	allegianceId 				INT(4)		UNSIGNED	NOT NULL ,
	allegiance 					VARCHAR(25)				NOT NULL ,
	stateId 					INT(8)		UNSIGNED	NOT NULL ,
	state 						VARCHAR(25)				NOT NULL ,
	securityId 					INT(11)		UNSIGNED	NOT NULL ,
	security 					VARCHAR(25)				NOT NULL ,
	primaryEconomyId 			INT(8)		UNSIGNED	NOT NULL ,
	primaryEconomy 				VARCHAR(25)				NOT NULL ,
	power 						VARCHAR(35)				NOT NULL ,
	powerState 					VARCHAR(25)				NOT NULL ,
	powerStateId 				INT(4)		UNSIGNED	NOT NULL ,
	needsPermit 				CHAR(1)					NOT NULL	DEFAULT '' ,
	updatedAt 					INT(11)		UNSIGNED	NOT NULL ,
	simbadRef 					VARCHAR(25)				NOT NULL ,
	controllingMinorFactionId	INT(11)		UNSIGNED	NOT NULL ,
	controllingMinorFaction		VARCHAR(50)				NOT NULL ,
	reserveTypeId 				INT(8)		UNSIGNED	NOT NULL ,
	reserveTyp 					VARCHAR(25)				NOT NULL ,
	KEY (power)
) ;

CREATE TABLE minorFaction (
	id							INT(11)		UNSIGNED	NOT NULL	PRIMARY KEY ,
	name						VARCHAR(50)				NOT NULL ,
	updatedAt					INT(11)		UNSIGNED	NOT NULL ,
	governmentId				INT(8)		UNSIGNED	NOT NULL ,
	government					VARCHAR(25)				NOT NULL ,
	allegianceId				INT(4)		UNSIGNED	NOT NULL ,
	allegiance					VARCHAR(25)				NOT NULL ,
	stateId						INT(8)		UNSIGNED	NOT NULL ,
	state						VARCHAR(25)				NOT NULL ,
	homeSystemId				INT(11)		UNSIGNED	NOT NULL ,
	isPlayerFaction				CHAR(1)					NOT NULL	DEFAULT '',
	FOREIGN KEY		(homeSystemId)	REFERENCES starSystem	(id)
) ;

ALTER TABLE starSystem
	ADD FOREIGN KEY (controllingMinorFactionId) REFERENCES minorFaction (id) ;

CREATE TABLE starSystemHasMinorFaction(
	id				INT(11)		UNSIGNED	NOT NULL	AUTO_INCREMENT	PRIMARY KEY ,
	minorFactionId	INT(11)		UNSIGNED	NOT NULL ,
	starSystemId	INT(11)		UNSIGNED	NOT NULL ,
	stateId			INT(8)		UNSIGNED	NOT NULL ,
	state			VARCHAR(25)				NOT NULL ,
	influence		FLOAT(7,4)	UNSIGNED	NOT NULL ,
	FOREIGN KEY	(minorFactionId)	REFERENCES minorFaction	(id) ,
	FOREIGN KEY	(starSystemId)		REFERENCES starSystem	(id) 
) ;
