define(['modules/core/src/TimeSignatureModel'], function(TimeSignatureModel) {
	/**
    * Bar core model
    * @exports core/BarModel
    */
	function BarModel(options) {
		options = options || {};
		this.begining = options.begining;
		this.clef = options.clef; // empty clef means it doesn't change from previous 
		this.ending = options.ending; // object with repeat, type (BEGIN,END, BEGIN_END, MID) and ending (text)
		this.style = options.style || '';
		this.setTimeSignatureChange(options.timeSignatureChange);// empty timeSignature means it doesn't change from previous
		this.keySignatureChange = options.keySignatureChange;
		this.labels = [];	// Segno, fine, coda ... we set an array, although currentlu CSLJson only accepts one label per bar
		if (options.label){
			this.labels.push(options.label);
		}else if (options.labels) {
			this.labels = options.labels;
		}
		this.sublabel = options.sublabel; // Ds, Ds al fine, ds al capo ...
	}


	BarModel.prototype.setBegining = function(begining) {
		if (typeof begining === "undefined") {
			throw 'BarModel - begining should not be undefined';
		}
		this.begining = begining;
	};

	BarModel.prototype.getBegining = function() {
		return this.begining;
	};

	BarModel.prototype.setClef = function(clef) {
		var clefType = ['', 'treble', 'bass', 'alto', 'tenor', 'percussion'];
		if (typeof clef === "undefined" && typeof clefType[clef] === "undefined") {
			throw 'BarModel - clef should not be undefined';
		}
		this.clef = clef;
	};

	BarModel.prototype.getClef = function() {
		return this.clef;
	};

	BarModel.prototype.setEnding = function(ending) {
		if (typeof ending === "undefined") {
			ending = undefined;
		}
		this.ending = ending;
	};
	BarModel.prototype.removeEnding = function() {
		this.ending = undefined;
	};
	BarModel.prototype.getEnding = function() {
		return this.ending;
	};

	BarModel.prototype.setStyle = function(style) {
		if (typeof style === "undefined") {
			style = '';
		}
		this.style = style;
	};

	BarModel.prototype.getStyle = function() {
		return this.style;
	};
	/**
	 * if param is string, it is converted to TimeSignatureModel
	 * @param {TimeSignatureModel | String} timeSignatureChange 
	 */
	BarModel.prototype.setTimeSignatureChange = function(timeSignatureChange) {
		if (!timeSignatureChange) {
			this.timeSignatureChange = undefined;
		} else if (typeof timeSignatureChange === 'string'){
			this.timeSignatureChange = new TimeSignatureModel(timeSignatureChange);
		}else{
			this.timeSignatureChange = timeSignatureChange;
		}
	};

	BarModel.prototype.getTimeSignatureChange = function() {
		return this.timeSignatureChange;
	};

	BarModel.prototype.setKeySignatureChange = function(keySignatureChange) {
		if (typeof keySignatureChange === "undefined") {
			keySignatureChange = '';
		}
		this.keySignatureChange = keySignatureChange;
	};

	BarModel.prototype.getKeySignatureChange = function() {
		return this.keySignatureChange;
	};

	BarModel.prototype.setLabel = function(label) {

		if (!!label && this.labels.indexOf(label) === -1){
			this.labels.push(label);	
		}
	};

	BarModel.prototype.getLabel = function() {
		label = this.labels.length === 0 ? null : this.labels.length === 1 ? this.labels[0] : this.labels; 
		return label || "";
	};

	BarModel.prototype.setSublabel = function(sublabel) {
		if (typeof sublabel === "undefined") {
			sublabel = '';
		}
		this.sublabel = sublabel;
	};

	/**
	 *
	 * @param  {boolan} formatted : if true, it returns formatted example for drawing.
	 * @return {String}  e.g.: if formatted -> "DC_AL_CODA"; else -> "DC al Coda"
	 */
	BarModel.prototype.getSublabel = function(formatted) {
		if (formatted && typeof this.sublabel !== 'undefined') {
			return this.sublabel.replace(/ /g, "_").toUpperCase();
		} else {
			return this.sublabel;
		}
	};
	/**
	 * @param  {boolean} unfolding , if true it means we are unfolding so we want to remove endings, labels..etc., if false, is pure cloning
	 * @return {BarModel}
	 */
	BarModel.prototype.clone = function(unfolding) {
		var newBar = new BarModel(this);
		if (unfolding)
		{
			newBar.removeEnding();
		}
		return newBar;
	};

	return BarModel;
});