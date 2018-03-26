UPDATE starSystem SET
		population = ?,
		securityId = ?,
		economyId = ?,
		powerId = ?,
		powerStateId = ?,
		updatedAt = ?,
		rulingMinorFactionId = ?
	WHERE id = ? ;
