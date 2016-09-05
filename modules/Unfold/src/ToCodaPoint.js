define(['modules/Unfold/src/EndPoint', 'modules/Unfold/src/ToCodaLabel'], function(EndPoint, ToCodaLabel) {
	var ToCodaPoint = Object.create(EndPoint);
	ToCodaPoint.callInitValues = function(leadsheetStructure, label, section, bar, playIndex) {
		this.initValues(leadsheetStructure, label, section, bar, playIndex);
	};
	ToCodaPoint.getJumpTo = function() {
		return this.leadsheetStructure.getStartLabel(ToCodaLabel.getCodaToLabel(this.label));
	};
	return ToCodaPoint;
});