define([
	'modules/Unfold/src/Repetition'
], function(Repetition) {
	var SectionRepetition = Object.create(Repetition);

	SectionRepetition.initValues = function(structure, section, playIndexFrom, playIndexTo) {
		this.setValues(
			structure.getSectionEndPoint(section, playIndexFrom),
			structure.getSectionStartPoint(section)
		);
		this.section = section;
	};
	SectionRepetition.isAfter = function(cursor) {
		// in first condition of && we duplicate code instead of super.isAfter() because the latter does not work for
		// OOLOs (http://stackoverflow.com/questions/29788181/kyle-simpsons-oloo-pattern-vs-prototype-design-pattern/31918303#31918303)
		return this.getFromPoint().isAfter(cursor.point) &&
			!(cursor.point.isInSection(this.structure, this.section) && this.maxPlayReached(cursor));

	};
	return SectionRepetition;
});