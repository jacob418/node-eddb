ALTER TABLE starSystem
	DROP KEY rulingFaction ,
	DROP KEY powerState ,
	DROP KEY power ,
	DROP KEY economy ,
	DROP KEY security_ ;

ALTER TABLE minorFaction
	DROP KEY government ,
	DROP KEY allegiance ;

ALTER TABLE starSystemHasMinorFaction
	DROP KEY minorFactionId ,
	DROP KEY starSystemId ,
	DROP KEY factionStateId ,
	DROP KEY pendingStateId ,
	DROP KEY recoveringStateId ;