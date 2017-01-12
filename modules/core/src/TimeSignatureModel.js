define(function() {
	/**
     * TimeSignature is a model to represent time signature for songmodel or barmodel, it contains all informations
     * about beatUnit and number of beats in a bar
     * @exports core/TimeSignatureModel
	 */
	function TimeSignatureModel(timeSig) {
		var re = /\d\/\d/;

		if (!timeSig || !timeSig.match(re)) {
			throw "TimeSignatureModel - Time signature not valid " + timeSig;
		}

		var timeSigArr = timeSig.split("/");

		// eg. 6/8 will be numBeats = 6 and beatUnit = 8
		this.numBeats = parseInt(timeSigArr[0], 10);
		this.beatUnit = parseInt(timeSigArr[1], 10);
	}

	/**
	 * The function returns the number of beats from the timeSig arguments or by default on current timeSignature
	 * @return {int} number of beats in a measure  in the unit of the signature. E.g.: for 6/8 -> 6, for 4/4 -> 4 for 2/2 -> 2
	 */
	TimeSignatureModel.prototype.getBeats = function() {
		return this.numBeats;
	};

	TimeSignatureModel.prototype.getBeatUnit = function() {
		return this.beatUnit;
	};

	/**
	 * The function returns the beats unit from the current time signature
	 * @return {int} beat unit in a measure. E.g.: for 6/8 -> 0.5, for 4/4 -> 1 for 2/2 -> 2
	 */
	TimeSignatureModel.prototype.getBeatUnitQuarter = function() {
		return 4 / this.getBeatUnit();
	};
	
	/**
	 * @return {int} number of quarter beats in a measure, e.g. for 6/8 -> 3, for 4/4 -> 4, for 2/2 -> 4
	 */
	TimeSignatureModel.prototype.getQuarterBeats = function() {
		return this.getBeatUnitQuarter() * this.getBeats();
	};

	/**
	 * @return {string} return a string of the timesignature in the type 3/4
	 */
	TimeSignatureModel.prototype.toString = function() {
		return this.getBeats() + '/' + this.getBeatUnit();
	};

	return TimeSignatureModel;
});