define(function() {
	var RepetitionConfig = function(repetition) {
		var DEFAULT_OPEN_PLAYS = 1;
		this.repetition = repetition;
		this.doIt = true;
		if (repetition.isSectionOpenRepetition) {
			this.numOpenPlays = DEFAULT_OPEN_PLAYS;
		}
	};
	return RepetitionConfig;
});