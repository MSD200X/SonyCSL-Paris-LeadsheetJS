define(['modules/Unfold/src/EndPoint'], function(EndPoint) {
	var RepeatPoint = Object.create(EndPoint);

	RepeatPoint.callInitValues = function(leadsheetStructure, name, section, bar, playIndex) {
		// var label = {};
		// label[name.replace("dc", "DC").replace("ds", "DS")] = name; //SURE WRONG
		var label = name;
		this.initValues(leadsheetStructure, label, section, leadsheetStructure.sections[section].getPlayEndBar(playIndex), playIndex);
	};

	return RepeatPoint;

});