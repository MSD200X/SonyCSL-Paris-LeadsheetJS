define([
	'utils/ChordUtils'
], function(ChordUtils) {
	/**
	 * Chord Model is a core model representing a leadsheet chord
	 * @exports core/ChordModel
	 * @param {} param is an object of parameters
	 * param accept : {
	 *		note: "C",				// note is a string indicating the root pitch of chord, it also can be % or %% (for repeat) or NC for No Chords
	 *		chordType: "7",			// chordtype is a string indicating a chordtype
	 *		base: {ChordModel},		// base is a chordModel which represent a base note
	 *		parenthesis: false,		// booalean indicating if there are parenthesis or not
	 *		beat: 1,				// startbeat in the current measure (start at 1)
	 *		barNumber: 0			// start bar number (start at 0)
	 * }
	 */
	function ChordModel(param) {
		this.note = (param && param.note) ? param.note : "";
		this.chordType = (param && param.chordType) ? param.chordType : "";
		//this.base = (param && param.base) ? param.base : {};
		if (param && param.base) {
			this.setBase(param.base);
		} else {
			this.base = {};
		}
		this.parenthesis = (param && typeof param.parenthesis !== "undefined") ? param.parenthesis : false;
		this.beat = (param && typeof param.beat !== "undefined") ? param.beat : 1;
		this.barNumber = (param && typeof param.barNumber !== "undefined") ? param.barNumber : 0;
		this.chordSymbolList = getChordSymbolList();

		function getChordSymbolList() {
			function htmlDecode(value) {
				var div = document.createElement('div');
				div.innerHTML = value;
				return div.firstChild.nodeValue;
			}
			var maps = {
				"halfdim": "&#248;", //ø   //216 -> Ø
				//"M7":"&#916;",//Δ
				"dim": "&#959;"
			};
			for (var prop in maps) {
				maps[prop] = htmlDecode(maps[prop]);
			}
			return maps;
		}
	}

	ChordModel.prototype.initChord = function(param) {};

	/* Basic getter setter */
	ChordModel.prototype.getNote = function() {
		return this.note;
	};
	ChordModel.prototype.setNote = function(note) {
		if (typeof note === "undefined") {
			throw 'Undefined note';
		}
		this.note = note;
	};

	ChordModel.prototype.getChordType = function() {
		return this.chordType;
	};

	/**
	 *
	 * @param {String} chordType could be undefined, e.g. in "NC" (no chord)
	 */
	ChordModel.prototype.setChordType = function(chordType) {
		this.chordType = chordType;
	};

	ChordModel.prototype.getBase = function() {
		return this.base;
	};
	ChordModel.prototype.isEmptyBase = function() {
		return (Object.keys(this.base).length === 0) ? true : false;
	};

	ChordModel.prototype.setBase = function(chordBase) {
		if (typeof chordBase === "string" && chordBase !== "") {
			this.base = new ChordModel();
             this.base.setChordFromString(chordBase);
        } else if ((chordBase === undefined || !(chordBase instanceof ChordModel)) && chordBase !== "") {
			throw "Base don't have the correct ChordModel type";
		} else { // if chord is a chordModel or an empty string (case empty string we are removing base)
			this.base = chordBase;
		}
	};

	ChordModel.prototype.getParenthesis = function() {
		return this.parenthesis;
	};
	ChordModel.prototype.setParenthesis = function(parenthesis) {
		this.parenthesis = !!parenthesis;
	};

	ChordModel.prototype.getBeat = function() {
		return this.beat;
	};

	ChordModel.prototype.setBeat = function(beat) {
		if (typeof beat !== "undefined" && !isNaN(beat)) {
			this.beat = parseInt(beat, 10);
			return true;
		}
		return false;
	};

	ChordModel.prototype.getBarNumber = function() {
		return this.barNumber;
	};

	ChordModel.prototype.setBarNumber = function(barNumber) {
		if (typeof barNumber !== "undefined" && !isNaN(barNumber)) {
			this.barNumber = Number(barNumber);
			return true;
		}
		return false;
	};
	/*End basic getter and setters*/


	ChordModel.prototype.isEmpty = function() {
		if (typeof this.note === "undefined" || this.note === "") {
			return true;
		}
		return false;
	};

	ChordModel.prototype.isInLastMeasureBeat = function(timeSignature) {
		return (this.beat == timeSignature.getBeats());
	};

	/**
	 *
	 * @param  {string}  delimiter  It's the separator between note and chordtype, by default there is no delimiter : C M7
	 * @param  {Boolean} isFormated If true some chords are formatted with symbols like Δ or ø
	 * @return {string}             [description]
	 */
	ChordModel.prototype.toString = function(delimiter, isFormated) {
		if (typeof delimiter === "undefined") {
			delimiter = "";
		}
		if (typeof isFormated === "undefined") {
			isFormated = true;
		}

		var chordType = this.getChordType();
		if (typeof chordType !== "undefined") {
			if (isFormated) {
				chordType = this.formatChordType(chordType);
			}
		} else {
			chordType = "";
		}

		var string = "";
		if (!this.isEmpty()) {
			string = this.getNote() + delimiter + chordType;
		}

		var base = this.getBase();
		if (base instanceof ChordModel && base.getNote() !== "") {
			var baseChordType = base.getChordType();
			if (typeof baseChordType !== "undefined") {
				if (isFormated) {
					baseChordType = this.formatChordType(baseChordType);
				}
			} else {
				baseChordType = "";
			}
			string += "/" + base.getNote() + delimiter + baseChordType;
		}

		if (this.getParenthesis()) {
			string = '(' + string + ')';
		}

		return string;
	};

	ChordModel.prototype.serialize = function() {
		var chordObj = {};
		chordObj.note = this.note;
		chordObj.chordType = this.chordType;

		if (this.isEmptyBase() !== true) {
			chordObj.base = this.base.toString();
		}
		chordObj.parenthesis = this.parenthesis;
		chordObj.beat = this.beat;
		chordObj.barNumber = this.barNumber;
		return chordObj;
	};


	ChordModel.prototype.clone = function() {
		return new ChordModel(this.serialize());
	};

	/*
	 * The function transforms a chordType String to symbols according chordSymbolList maps
	 * Example: halfdim become ø
	 */
	ChordModel.prototype.formatChordType = function(chordTypeName) {
		if (typeof chordTypeName === "undefined") {
			return '';
		}
		for (var props in this.chordSymbolList) {
			chordTypeName = chordTypeName.replace(props, this.chordSymbolList[props]);
		}
		return chordTypeName;
	};

	ChordModel.prototype.unformatChordType = function(chordTypeName) {
		if (typeof chordTypeName === "undefined") {
			return '';
		}
		for (var props in this.chordSymbolList) {
			chordTypeName = chordTypeName.replace(this.chordSymbolList[props], props);
		}
		return chordTypeName;
	};
	/**
	 * Compare current ChordModel to a chord JSON
	 * @param  {Object} chordJson {p: 'F', ch: 'm7', pb: 'C', pch: 'm7'}  (pch is almost never used)
	 * @return {Boolean}
	 */
	ChordModel.prototype.equalsTo = function(chordJson) {
		if (this.getNote() === chordJson.p &&
			(!this.getChordType() && !chordJson.ch || //either both base chord types don't exists
				this.getChordType() === chordJson.ch // either they are equal
			)
		) {
			if (this.isEmptyBase() && !chordJson.bp) {
				return true;
			} else if (!this.isEmptyBase() && chordJson.bp) {
				if (this.getBase().getNote() == chordJson.bp) {
					if (!this.getBase().getChordType() && !chordJson.bch) { //either both base chord types don't exists
						return true;
					} else if (this.getBase().getChordType() === chordJson.bch) { //either they are equal
						return true;
					}
				}
			}
		}
		return false;
	};

	/**
	 * Set chord from a string in the format as C#m7 or C7/G
	 * @param {string} format as C#m7 or C7/G
	 */
	ChordModel.prototype.setChordFromString = function(stringChord) {
		var jsonChord = ChordUtils.string2Json(stringChord);
		this.note = (jsonChord.p) ? jsonChord.p : "";
		this.chordType = (jsonChord.ch) ? jsonChord.ch : "";
		this.base = {};
		if (jsonChord.bp || jsonChord.bch) {
			this.base = new ChordModel();
			if (jsonChord.bp) {
				this.base.setNote(jsonChord.bp);
			}
			if (jsonChord.bch) {
				this.base.setChordType(jsonChord.bch);
			}
		}
		this.parenthesis = (typeof jsonChord.parenthesis !== "undefined") ? jsonChord.parenthesis : false;
	};
	return ChordModel;
});