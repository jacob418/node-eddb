ALTER TABLE starSystem
	DROP KEY controllingFaction ,
	DROP KEY powerState ,
	DROP KEY power ,
	DROP KEY economy ,
	DROP KEY minorFaction ;

ALTER TABLE minorFaction
	DROP KEY goverment ,
	DROP KEY allegiance ;

ALTER TABLE starSystemHasMinorFaction
	DROP KEY minorFactionId ,
	DROP KEY starSystemId ,
	DROP KEY factionStateId ,
	DROP KEY pendingStateId ,
	DROP KEY recoveringStateId ;