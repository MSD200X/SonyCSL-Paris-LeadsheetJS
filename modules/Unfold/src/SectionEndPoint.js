define(['modules/Unfold/src/EndPoint'], function(EndPoint) {
	var SectionEndPoint = Object.create(EndPoint);

	SectionEndPoint.callInitValues = function(leadsheetStructure, section, playIndex) {

		var label = 'end_section_' + section + '_' + playIndex;
		this.initValues(leadsheetStructure, label, section, leadsheetStructure.sections[section].getPlayEndBar(playIndex), playIndex);
	};
	SectionEndPoint.getJumpTo = function() {
		return this.leadsheetStructure.getSectionStartPoint(this.section + 1);
	};
	return SectionEndPoint;
});