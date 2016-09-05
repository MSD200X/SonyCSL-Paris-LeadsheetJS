define([
	'modules/Unfold/src/StartLabel',
	'modules/Unfold/src/EndLabel'
], function(StartLabel, EndLabel) {
	var CodaToLabel = Object.create(StartLabel);

	CodaToLabel.getToCodaLabel = function(codaToLabel) {
		if (codaToLabel === StartLabel.CODATO) {
			return EndLabel.TOCODA;
		} else if (codaToLabel === StartLabel.CODA2TO) {
			return EndLabel.TOCODA2;
		}
	};
	return CodaToLabel;
});