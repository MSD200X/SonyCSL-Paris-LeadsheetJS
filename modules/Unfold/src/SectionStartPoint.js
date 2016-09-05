define(['modules/Unfold/src/StartPoint'], function(StartPoint) {
	var SectionStartPoint = Object.create(StartPoint);

	SectionStartPoint.callInitValues = function(leadsheetStructure, section) {

		var label = 'start_section_' + section;
		this.initValues(leadsheetStructure, label, section, 0);
	};
	return SectionStartPoint;
});