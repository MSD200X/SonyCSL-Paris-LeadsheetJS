define([
	'modules/Unfold/src/Repetition',
	'modules/Unfold/src/RepeatPoint',
	'modules/Unfold/src/StartLabel',
	'modules/Unfold/src/EndLabel',
	'underscore'

], function(Repetition, RepeatPoint, StartLabel, EndLabel,_) {
	var DaAlRepetition = _.extendOwn(Object.create(Repetition), {
		al: undefined,
		da: undefined
	});
	DaAlRepetition.setDa = function(da) {
		this.da = da;
		this.setToPoint(this.structure.getStartLabel(this.da));
	};

	DaAlRepetition.setAl = function(al) {
		this.al = al;
	};

	DaAlRepetition.getDaPoint = function() {
		return this.getToPoint();
	};

	DaAlRepetition.getUntilPoint = function() {
		if (!this.until && !!this.al) {
			if (!this.structure.hasEndLabel(this.al)) {
				if (this.al === EndLabel.FINE) {
					this.al = EndLabel.END;
				} else {
					this.al = null;
					return;
				}
			}
			this.until = this.structure.getEndLabel(this.al);
		}
		return this.until;
	};
	// constructor
	DaAlRepetition.initValues = function(leadsheetStructure, sublabel, section, bar, playIndex) {

		var invalidRepetitionException = "Invalid repetition";
		var repeatPoint = Object.create(RepeatPoint);
		repeatPoint.callInitValues(leadsheetStructure, sublabel, section, bar, playIndex);

		this.setValuesFromPoint(repeatPoint);

		var parts = sublabel.split(" ");
		var numTokens = parts.length;
		if (numTokens !== 1 && numTokens !== 3) { //e.g. DS (1) or DC al Capo (3)
			throw invalidRepetitionException;
		}

		this.setDa(StartLabel.fromString(parts[0]));
		if (!this.getDaPoint()) {
			throw invalidRepetitionException;
		}
		if (numTokens === 3) {
			if (parts[1].toLowerCase() !== 'al') {
				throw invalidRepetitionException;
			}
			this.setAl(EndLabel.fromString(parts[2]));
		}
	};
	return DaAlRepetition;
});