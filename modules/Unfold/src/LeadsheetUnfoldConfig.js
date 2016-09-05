define(function() {
	var LeadsheetUnfoldConfig = function(leadsheetStructure) {
		this.leadsheet = leadsheetStructure.leadsheet;
		this.repetitions = [];
		var repetitions = leadsheetStructure.getRepetitions();
		for (var i = 0; i < repetitions.length; i++) {
			this.repetitions.push(repetitions[i].getConfig());
		}
	};
	return LeadsheetUnfoldConfig;
});