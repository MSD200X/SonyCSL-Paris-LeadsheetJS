define(['modules/Unfold/src/SectionRepetition'], function(SectionRepetition) {
	var SectionFiniteRepetition = Object.create(SectionRepetition);

	SectionFiniteRepetition.callInitValues = function(structure, section, playIndex) {
		this.initValues(structure, section, playIndex, playIndex + 1);
		this.playIndex = playIndex;
	};
	SectionFiniteRepetition.maxPlayReached = function(cursor) {
		return cursor.playIndex > this.playIndex;
	};
	SectionFiniteRepetition.updateCursor = function() {
		var toPoint = this.getToPoint();
		return {
			point: toPoint,
			playIndex: this.playIndex + 1
		};
	};
	return SectionFiniteRepetition;
});