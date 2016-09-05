define([
	'modules/Unfold/src/PointLabel'
], function(PointLabel) {
	var StartLabel = PointLabel.create();

	StartLabel.CAPO = "Capo";
	StartLabel.SEGNO = "Segno";
	StartLabel.SEGNO2 = "Segno2";
	StartLabel.CODATO = "CodaTo";
	StartLabel.CODA2TO = "Coda2To";

	StartLabel.addSoloLabel(StartLabel.SEGNO, 'start');
	StartLabel.addSoloLabel(StartLabel.SEGNO2, 'start');

	StartLabel.fromString = function(name) {
		switch (name.toLowerCase()) {
			case "dc":
				return StartLabel.CAPO;
			case "ds":
				return StartLabel.SEGNO;
			case "ds2":
				return StartLabel.SEGNO2;
			case "coda to":
				return StartLabel.CODATO;
			case "coda2 to":
				return StartLabel.CODA2TO;
			default:
				return null;
		}
	};
	return StartLabel;
});