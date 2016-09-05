define([
	'modules/Unfold/src/StartLabel',
	'modules/Unfold/src/EndLabel'
], function(StartLabel, EndLabel) {
	var ToCodaLabel = Object.create(EndLabel);

	ToCodaLabel.getCodaToLabel = function(toCodaLabel) {
		if (toCodaLabel === EndLabel.TOCODA) {
			return StartLabel.CODATO;
		} else if (toCodaLabel === EndLabel.TOCODA2) {
			return StartLabel.CODA2TO;
		}
	};
	return ToCodaLabel;
});