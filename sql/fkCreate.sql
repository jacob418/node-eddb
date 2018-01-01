ALTER TABLE starSystem
	ADD FOREIGN KEY controllingFaction	(controllingMinorFactionId) REFERENCES minorFaction (id) ,
	ADD FOREIGN KEY powerState			(powerStateId) REFERENCES powerState (id) ,
	ADD FOREIGN KEY power				(powerId) REFERENCES power (id) ,
	ADD FOREIGN KEY economy				(economyId) REFERENCES economy (id) ,
	ADD FOREIGN KEY minorFaction		(securityId) REFERENCES minorFaction (id) ;

ALTER TABLE minorFaction
	ADD FOREIGN KEY goverment			(governmentId) REFERENCES goverment (id) ,
	ADD FOREIGN KEY allegiance			(allegianceId) REFERENCES allegiance (id) ;

ALTER TABLE starSystemHasMinorFaction
	ADD FOREIGN KEY minorFactionId			(minorFactionId) REFERENCES minorFaction (id) ,
	ADD FOREIGN KEY starSystemId			(starSystemId) REFERENCES starSystem (id)  ,
	ADD FOREIGN KEY factionStateId			(factionStateId) REFERENCES factionState (id)  ,
	ADD FOREIGN KEY pendingStateId			(pendingStateId) REFERENCES factionState (id)  ,
	ADD FOREIGN KEY recoveringStateId		(recoveringStateId) REFERENCES factionState (id) ;
