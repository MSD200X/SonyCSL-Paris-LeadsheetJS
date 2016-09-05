define(['modules/Unfold/src/StructurePoint'], function(StructurePoint) {
	var EndPoint = Object.create(StructurePoint);

	EndPoint.initValues = function(leadsheetStructure, label, section, bar, playIndex) {
		this.setValues(leadsheetStructure, label, section, bar, playIndex);
		leadsheetStructure.addEndLabel(this);
	};
	EndPoint.getJumpTo = function() {
		return null;
	};
	EndPoint.updateCursor = function() {
		return {
			point: this.getJumpTo(),
			playIndex: 0
		};
	};
	return EndPoint;
});