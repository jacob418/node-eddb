INSERT INTO starSystemHasMinorFaction
	(minorFactionId, starSystemId, stateId, pendingStateId, recoveringStateId, influence)
	VALUES(?, ?, ?, ?, ?, ?)
	ON DUPLICATE KEY UPDATE
		stateId = ?,
		pendingStateId = ?,
		recoveringStateId = ?,
		influence = ? ;

