define(['modules/Unfold/src/StructurePoint'], function(StructurePoint) {
	var StartPoint = Object.create(StructurePoint);
	// to avoid super we call init differently en each child (see 1st comment on discussion https://davidwalsh.name/javascript-objects-deconstruction)
	StartPoint.initValues = function(leadsheetStructure, label, section, bar, playIndex) {
		this.setValues(leadsheetStructure, label, section, bar, playIndex);
		leadsheetStructure.addStartLabel(this);
	};
	return StartPoint;
});