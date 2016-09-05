define([
	'underscore',
	'modules/Unfold/src/EndLabel',
	'modules/Unfold/src/DaAlRepetition',
	'modules/Unfold/src/Repetition',
	'modules/Unfold/src/SectionRepetition',
	'modules/Unfold/src/SectionFiniteRepetition'
], function(_, EndLabel, DaAlRepetition, Repetition, SectionRepetition, SectionFiniteRepetition) {
	var RepetitionsHolder = {};

	RepetitionsHolder.init = function(structure) {
		this.repetitions = structure.getRepetitions();
	};
	RepetitionsHolder.getNextRepetitionIfBefore = function(cursor, target) {
		var self = this;

		function findNextRepetition(cursor) {
			var repetition;
			for (var i = 0; i < self.repetitions.length; i++) {
				repetition = self.repetitions[i];
				if (repetition.config.doIt && repetition.isAfter(cursor)) {
					return i;
				}
			}
			return -1;
		}

		var index = findNextRepetition(cursor);
		if (index === -1) {
			return null;
		}
		var repetition = this.repetitions[index];
		var targetPoint = target.point;
		var repTargetPoint;
		if (!!targetPoint && !targetPoint.hasLabel(EndLabel.END)) {
			repTargetPoint = repetition.getTargetPoint();
			if (!repTargetPoint.isBefore(targetPoint))
				return null;
		}
		if (Object.getPrototypeOf(repetition) === DaAlRepetition)
			this.repetitions.splice(index, 1);

		return repetition;
	};
	return RepetitionsHolder;
});