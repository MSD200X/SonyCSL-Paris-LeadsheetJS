define(['modules/Unfold/src/SectionRepetition'], function(SectionRepetition) {
	var SectionOpenRepetition = Object.create(SectionRepetition);

	SectionOpenRepetition.callInitValues = function(structure, section) {
		this.isSectionOpenRepetition = true; //we add a property to avoid the use of 'instanceof SectionOpenRepetition' which causes circular dependencies
		this.initValues(structure, section, 0, 0);
	};
	SectionOpenRepetition.maxPlayReached = function(cursor) {
		return cursor.playIndex >= this.getConfig().numOpenPlays;
	};
	SectionOpenRepetition.updateCursor = function(cursor) {
		return {
			point: this.getToPoint(),
			playIndex: cursor.playIndex + 1
		};
	};
	return SectionOpenRepetition;
});