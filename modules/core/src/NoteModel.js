define(['utils/NoteUtils'], function(NoteUtils) {

	/**
	 * Note Model is a core model representing a leadsheet note
	 * @exports core/NoteModel
	 * @param {Object|String|null} param : depending on the type it will create an empty note, a rest note or a pitch note
	 */
	function NoteModel(param) {
		param = param || {};
		this.pitchClass = []; // Note c, b
		this.octave = param.octave || []; // octave from 0 to 8
		this.accidental = []; // b or #
		this.duration = param.duration; // string duration "h", "q", "8", "16" ...etc
		this.isRest = param.isRest || false;
		this.dot = param.dot || 0; // 0,1,2
		this.tie = param.tie; // contain "start", "stop", "stop_start"
		this.tuplet = param.tuplet;
		this.timeModification = param.timeModification; // it's an attribute that exist only with tuplet

		//for whole silences that cover an entire measure, duration will depend on bar's time signature:
		this.durationDependsOnBar = param.durationDependsOnBar;
		this.barDuration = null;

		if (typeof this.tuplet !== "undefined") {
			this.setTuplet(this.tuplet, this.timeModification);
		}

		if (typeof param == "string") { //duration "h","d","8" or C#/4-8r
			this.setNoteFromString(param);
		} else if (typeof param !== "undefined" && typeof param.pitchList !== "undefined") {
			if (param.pitchList.length > 1) {
				param.pitchList = NoteUtils.sortPitches(param.pitchList);
			}
			for (var i = 0, c = param.pitchList.length; i < c; i++) {
				this.setNoteFromString(param.pitchList[i], i);
			}
		}
	}

	/**
	 *		
	 * @return {String} examples: "A#/4-q", "E/4-q.", "qr", "w.r"
	 */
	NoteModel.prototype.toString = function() {
		var str, dur = this.duration;
		for (var i = 0; i < this.dot; i++) {
			dur += ".";
		}
		if (this.timeModification) {
			dur += "(" + this.timeModification + ")";
		}
		if (this.isRest) {
			str = dur + "r";
		} else {
			str = this.pitchClass[0] + this.accidental[0] + "/" + this.octave[0] + "-" + dur;
		}
		return str;
	};
	/**
	 * String examples: C#/4-8. 
	 * @param {String} string string defining a note like C#/4-8
	 * @param {Integer} index  
	 */
	NoteModel.prototype.setNoteFromString = function(string, index) {
		index = index || 0;
		var re = /[a-g|A-G](#{1,2}|b{1,2}|n)?(-[w|h|q|8|16|32|64])?\.{0,2}\/\d/;
		var partDuration;
		if (string.match(re)) {
			var parts = string.split("-");
			var partPitch = parts[0].split("/");
			this.pitchClass[index] = partPitch[0].substr(0, 1).toUpperCase();
			this.accidental[index] = partPitch[0].substr(1, partPitch[0].length);
			this.octave[index] = partPitch[1];

			if (parts.length == 2) {
				partDuration = parts[1];
			}
		} else {
			re = /[w|h|q|8|16|32|64](r)?/;
			if (!string.match(re)) {
				throw "Creating pitch " + string + ". Should be in de form [pitch][acc]/[octave]. e.g. Ab/4 or [duration] if you want a rest eg. '8'";
			}
			this.pitchClass[0] = 'B';
			this.octave[0] = '4';
			this.accidental[0] = '';
			var restPosition = string.indexOf("r");
			if (restPosition === -1) {
				partDuration = string;
			} else {
				partDuration = string.substr(0, restPosition);
			}
			this.isRest = true;
		}
		if (partDuration) {
			// check if there is a dot
			var dotPosition = partDuration.indexOf(".");
			if (dotPosition == -1) {
				// check if there is a time modification
				var partDurationModidifications = partDuration.match(/(q){1}\(([\d\/]+)\)/);
				if (partDurationModidifications) {
					partDuration = 	partDurationModidifications[1];
					this.timeModification = partDurationModidifications[2];
				}
				this.duration = partDuration;
			} else {
				this.duration = partDuration.split('.')[0];
				this.dot = partDuration.length - dotPosition;
			}
		}
	};

	NoteModel.prototype.getNumPitches = function() {
		return this.pitchClass.length;
	};

	NoteModel.prototype.setPitchClass = function(value, i) {
		i = i || 0;
		this.pitchClass[i] = value;
	};

	NoteModel.prototype.getPitchClass = function(i) {
		i = i || 0;
		return this.pitchClass[i];
	};

	NoteModel.prototype.getAccidental = function(i) {
		i = i || 0;
		return this.accidental[i];
	};

	NoteModel.prototype.setOctave = function(octave, i) {
		i = i || 0;
		this.octave[i] = octave;
		return this.octave[i];
	};

	NoteModel.prototype.getOctave = function(i) {
		i = i || 0;
		return this.octave[i];
	};

	
	/**
	 * @param  {Number} index        
	 * @param  {Boolean} withoutSlash 
	 * @return {String}        e.g.: "A#/5", "Bb/4" or       "A#5", "Bb4"
	 */
	NoteModel.prototype.getPitch = function(index, withoutSlash) {
		// check if number, check if  < numPitches
		index = index || 0;

		var accidental = '';
		if (this.accidental[index] !== undefined) {
			accidental = this.accidental[index];
		}

		var octave = '';
		if (this.octave[index] !== undefined) {
			if (!withoutSlash) octave += '/';
			octave += this.octave[index];
		}
		return this.pitchClass[index] + accidental + octave;
	};


	/**
	 * @param {Number} dots
	 */
	NoteModel.prototype.setDot = function(dots) {
		if (typeof dots === "undefined") {
			return;
		}
		var nDots = Number(dots);
		if (isNaN(nDots) || nDots < 0 || nDots > 2) throw "not valid number of dots";
		this.dot = nDots;
	};

	NoteModel.prototype.getDot = function() {
		return this.dot;
	};

	/**
	 * @param {String} tieType "start","stop" or "stop_start"
	 */
	NoteModel.prototype.setTie = function(tieType) {
		if (!tieType) return;

		var arr = ["start", "stop", "stop_start"];
		if (arr.indexOf(tieType) == -1) throw "NoteModel - setTie - not valid tie type " + tieType;

		if (!this.tie) this.tie = tieType;
		else if (tieType != this.tie) this.tie = "stop_start";
	};

	NoteModel.prototype.getTie = function() {
		return this.tie;
	};

	NoteModel.prototype.removeTie = function(tieType) {
		if (this.tie != "stop_start" || tieType === undefined) {
			this.tie = null;
		} else {
			// This part allow keeping a part of tie active when we call removeTie on stop_start note
			this.tie = (tieType == "start") ? "stop" : "start";
		}
	};
	/**
	 * if tieType not specified, returns boolean if there is actually a tie (no matter which type)
	 * if tieType is specified checks in a 'soft' way, that means that for tie "stop_start", both isTie("start")
	 * and isTie("stop") will return true
	 *
	 * @param  {String}  tieType
	 * @return {Boolean}
	 */
	NoteModel.prototype.isTie = function(tieType) {
		if (!tieType) return this.tie != null;
		else return this.tie && this.tie.indexOf(tieType) != -1;
	};

	/* if both parameters are null or undefined, function does not do anything, this happens on constructor
	 *
	 * @param {[type]} typeTuplet       "start","stop","middle", middle does not set the value this.tuplet
	 * @param {[type]} timeModification if empty set to "3/2"
	 * examples:
	 *		setTuplet(), setTuplet(undefined)  won't do anything
	 *		setTuplet("middle")	will set only this.timeModification
	 */
	NoteModel.prototype.setTuplet = function(typeTuplet, timeModification) {
		if (!typeTuplet && !timeModification) return;

		var validTypes = ["start", "stop", "stop_start", "middle"];
		if (typeTuplet && validTypes.indexOf(typeTuplet) == -1) {
			throw "not valid typeTuplet " + typeTuplet;
		}
		this.timeModification = timeModification || "3/2";
		//we know typeTuple is a valid type, just check that is not middle
		if (typeTuplet != "middle") this.tuplet = typeTuplet;
	};
	/**
	 * @return {String} it can be "start", "stop", "stop_start", "middle"
	 */
	NoteModel.prototype.getTuplet = function() {
		if (this.timeModification && !this.tuplet) {
			return "middle";
		} else {
			return this.tuplet;
		}
	};

	NoteModel.prototype.getTimeModification = function() {
		return this.timeModification || null;
	};

	NoteModel.prototype.removeTuplet = function() {
		this.timeModification = null;
		this.tuplet = null;
	};

	/**
	 * if "type" is undefined, just checkes that is tuplet,
	 * if type is 'start' or 'stop' returns checks that tuplet is type
	 * @param  {String}  type  "start" , "stop" or undefined
	 * @return {Boolean}
	 */
	NoteModel.prototype.isTuplet = function(type) {
		return (!type) ? this.timeModification != null :
			this.timeModification != null && this.tuplet && this.tuplet.indexOf(type) != -1;
	};

	/**
	 * @param {Boolean} bool
	 */
	NoteModel.prototype.setRest = function(bool) {
		if (typeof bool === "undefined") bool = true;
		this.isRest = bool;
		//if (this.isRest) this.setRestPitch(); // maybe use it in module viewer, because it's only for vexflow viewer
		this.setAccidental("");
	};

	/**	
	 * @param {String} acc ["","#","b","n"]
	 * @param {Number} i   default 0
	 */
	NoteModel.prototype.setAccidental = function(acc, i) {
		var validAccidentals = ["", "#", "b", "n", "##", "bb"];
		if (validAccidentals.indexOf(acc) == -1) throw "invalid accidental";
		i = i || 0;
		this.accidental[i] = acc;
	};
	NoteModel.prototype.getAccidental = function(i) {
		i = i || 0;
		return this.accidental[i];
	};
	NoteModel.prototype.removeAccidental = function(i) {
		this.setAccidental("", i);
	};

	NoteModel.prototype.getNumPitches = function() {
		return this.pitchClass.length;
	};
	/**
	 * returns duration in number of beats. where 1.0 is a quarter note, regardless of the time signature (6/8, 4/4...)
	 * in that case it's sent as parameter
	 * @return {Float}
	 */
	NoteModel.prototype.getDuration = function() {
		var dur = 0.0;
		dur = NoteUtils.getBeatFromStringDuration(this.duration);
		if (dur === 4) {
			if (this.isRest && this.durationDependsOnBar && this.barDuration) {
				dur = this.barDuration;
			}
		}
		if (this.timeModification != null) {
			var nums = this.timeModification.split("/");
			dur = dur * parseInt(nums[1], null) / parseInt(nums[0], null);
		}
		var durTmp = dur;
		for (var i = 0, c = this.dot; i < c; i++) {
			durTmp /= 2;
			dur += durTmp;
		}
		return dur;
	};

	NoteModel.prototype.setDurationByBeats = function(dur) {
		if (typeof dur !== 'number') {
			throw "NoteModel - setDurationByBeats -  dur is not a number ";
		}

		if (dur * 64 !== parseInt(dur * 64, 10)) {
			throw "NoteModel - setDuration - dur should be fraction of 2, dur =" + dur;
		}
		var finalStringDur,
			durObj,
			newNumDur,
			residualDur;

		this.setDot(0);
		for (var i in NoteUtils.ARR_DUR) {
			durObj = NoteUtils.ARR_DUR[i];
			if (durObj.numDur == dur) {
				finalStringDur = durObj.strDur;
				break;
			} else if (durObj.numDur < dur) {
				finalStringDur = durObj.strDur;
				//if not equal, must have dots, check
				newNumDur = dur - durObj.numDur;
				residualDur = dur - newNumDur;

				if (newNumDur == residualDur / 2) {
					this.setDot(1);
				} else if (newNumDur > residualDur / 2) {
					newNumDur = newNumDur - residualDur / 2;
					if (newNumDur == residualDur / 4) {
						this.setDot(2);
					} else {
						throw "NoteModel - setDuration - could not find mapping duration for " + dur;
					}
				}
				break;
			}
		}
		this.duration = finalStringDur;
	};

	/**
	 * @param {string|number} dur can be a string "h" , "q" , "8" ...etc. or a number 
	 */
	NoteModel.prototype.setDuration = function(dur) {
		if (!NoteUtils.getBeatFromStringDuration(dur)) {
			throw "NoteModel - setDuration - did not found string duration: " + dur;
		}
		this.duration = dur;
	};

	NoteModel.prototype.serialize = function(complete) {
		if (complete === undefined) complete = true;

		var noteObj = {};
		noteObj.pitchList = [];

		for (var i = 0, c = this.getNumPitches(); i < c; i++) {
			noteObj.pitchList.push(this.getPitch(i));
		}
		noteObj.duration = this.duration;
		//important only set property if not null, 
		if (this.dot != null) noteObj.dot = this.dot;
		if (this.tie != null && complete) noteObj.tie = this.tie;
		if (this.tuplet != null && complete) noteObj.tuplet = this.tuplet;
		if (this.timeModification != null && complete) noteObj.timeModification = this.timeModification;
		
		noteObj.isRest = this.isRest;
		if (this.durationDependsOnBar){
			noteObj.durationDependsOnBar = this.durationDependsOnBar;	
		}
		return noteObj;
	};



	/**
	 * @param  {boolean} complete: if true, clones completely (case of copy/paste), if false,
	 *                             ommits ties and tuplets (case of addNote). If not defined, it's true
	 * @return {NoteModel}
	 */
	NoteModel.prototype.clone = function(complete) {
		return new NoteModel(this.serialize(complete));
	};

	return NoteModel;
});