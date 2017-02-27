define(['underscore'], function(_) {

	var NoteUtils = {};
	NoteUtils.ACCIDENTALS = ["bb", "b", "", "#", "##"];
	NoteUtils.NATURAL_PITCHES = {
		C: 0,
		D: 1,
		E: 2,
		F: 3,
		G: 4,
		A: 5,
		B: 6
	};
	/**
	 * @param  {String} pitch e.g. "A#" or "Cb"
	 * @return {Number}       e.g. 10   or  11
	 */
	NoteUtils.pitch2Number = function(pitch) {
		var classPitch2Number = {
			C: 0,
			D: 2,
			E: 4,
			F: 5,
			G: 7,
			A: 9,
			B: 11
		};
		var naturalPitch = pitch.substring(0, 1);
		var accidental = pitch.substring(1, pitch.length);
		var number = classPitch2Number[naturalPitch];
		for (var i = 0; i < NoteUtils.ACCIDENTALS.length; i++) {
			if (accidental == NoteUtils.ACCIDENTALS[i]) {
				number += (i - 2);
				return number < 0 ? number + 12 : number > 11 ? number - 12 : number;
			}
		}
	};
	NoteUtils.PITCH_CLASSES = ["C", "D", "E", "F", "G", "A", "B"];
	NoteUtils.ASC_CHROMATIC_PITCHES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
	NoteUtils.DESC_CHROMATIC_PITCHES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];


	NoteUtils.DURATIONS = {
		"w": 	4,
		"h": 	2,
		"q": 	1,
		"8": 	0.5,
		"16":  	0.25,
		"32":  	0.125,
		"64":  0.0625
	};
	NoteUtils.DURATIONS_SORTED = _.values(NoteUtils.DURATIONS).sort(function(a, b) { return a<b;});

	NoteUtils.INV_DURATIONS = _.invert(NoteUtils.DURATIONS);
	
	NoteUtils.ARR_DUR = [{
		strDur: 'w',
		numDur: 4
	}, {
		strDur: 'h',
		numDur: 2
	}, {
		strDur: 'q',
		numDur: 1
	}, {
		strDur: '8',
		numDur: 0.5
	}, {
		strDur: '16',
		numDur: 0.25
	}, {
		strDur: '32',
		numDur: 0.125
	}, {
		strDur: '64',
		numDur: 0.0625
	}];


	NoteUtils.getStringFromBeatDuration = function(beat) {
		return NoteUtils.INV_DURATIONS[beat];
	};
	NoteUtils.getBeatFromStringDuration = function(string) {
		return NoteUtils.DURATIONS[string];		
	};
	
	NoteUtils.getNotesDurationsToFillDuration = function(durationToFill) {
		var durations = [];
		var pushDuration = function(durationToPush) {
			durations.push(durationToPush);
			durationToFill -= durationToPush;	
		};
		for (var i in NoteUtils.DURATIONS_SORTED) {
			if (durationToFill >= NoteUtils.DURATIONS_SORTED[i]) {
				var coef = 1;
				if (durationToFill % NoteUtils.DURATIONS_SORTED[i] === 0) {
					coef = durationToFill / NoteUtils.DURATIONS_SORTED[i];
				}
				pushDuration(coef * NoteUtils.DURATIONS_SORTED[i]);
				if (durationToFill === 0) {
					break;
				}
			}
		}
		return durations;
	};

	/**
	 * sorting pitches in case of polyphony because Vexflow adds accidentals in order relating to pitch order,
	 * not to the actual array order
	 * @param  {Array} pitches e.g.: ["A"]
	 * @return {Array}         [description]
	 */
	NoteUtils.sortPitches = function(pitches) {

		/**
		 * @param  {string} pitch1 example: "A/4"
		 * @param  {string} pitch2 example: "Db/3"
		 * @return {int}    1 if (pitch1>pitch2), 0 if they are equal, -1 if (pitch1<pitch2)
		 */
		function comparePitches(pitch1, pitch2) {
			var r;
			var pc1 = pitch1.substring(0, 1).toUpperCase();
			var oct1 = parseInt(pitch1.slice(-1), null);
			var pc2 = pitch2.substring(0, 1).toUpperCase();
			var oct2 = parseInt(pitch2.slice(-1), null);

			if (oct1 > oct2) r = 1;
			else if (oct1 < oct2) r = -1;
			else { //if equal
				var map = NoteUtils.NATURAL_PITCHES;

				if (map[pc1] > map[pc2]) r = 1;
				if (map[pc1] < map[pc2]) r = -1;
				else r = 0;
			}
			return r;
		}

		var pitchClass,
			octave,
			sortedPitches = [],
			curPitch,
			prevPitch = null,
			i = 0,
			inserted,
			op,
			resultComparison,
			oPitch;

		for (var p in pitches) {
			curPitch = pitches[p];
			if (sortedPitches.length === 0) {
				sortedPitches.push(curPitch);
			} else {
				inserted = false;
				op = 0;
				while (inserted === false && op < sortedPitches.length) {
					oPitch = sortedPitches[op];
					resultComparison = comparePitches(curPitch, oPitch);
					if (resultComparison < 0) {
						sortedPitches.splice(op, 0, curPitch);
						inserted = true;
					}
					op++;
				}
				if (inserted === false) {
					sortedPitches.push(curPitch);
				}
			}

		}
		return sortedPitches;
	};


	NoteUtils.number2Pitch = function(number) {
		var number2PitchArray = {
			0: "C",
			1: "C#",
			2: "D",
			3: "D#",
			4: "E",
			5: "F",
			6: "F#",
			7: "G",
			8: "G#",
			9: "A",
			10: "A#",
			11: "B",
		};
		number = (number + 12) % 12;
		var pitch;
		if (typeof number2PitchArray[number] !== "undefined") {
			pitch = number2PitchArray[number];
		}
		return pitch;
	};

	NoteUtils.transformStringNote2ArrayNote = function(chordString) {
		var chordArray = [];
		if (typeof chordString !== "undefined") {
			var chord = chordString.split(',');
			for (var i = 0; i < chord.length; i++) {
				var s = (/[A-Z][b,#]{0,2}[0-9]?/i).exec(chord[i]);
				if (s) {
					chordArray.push(s[0]);
				}
			}
		}
		return chordArray;
	};

	NoteUtils.getValidPitch = function(value) {
		var re = /[a-g|A-G]/;
		if (typeof value === "number") {
			return -1;
		} else {
			if (!value.match(re))
				return -1;
			else
				return value.toUpperCase();
		}
	};


	NoteUtils.getClosestKey = function(pitch, pitchClass2) {
		var pitchClass = pitch.split('/')[0];
		var pitches = this.PITCH_CLASSES;
		var pos1 = this.getKeyPosition(pitchClass, pitches);
		var pos2 = this.getKeyPosition(pitchClass2, pitches);
		var d1 = pos2 - pos1;
		var d2 = pitches.length - Math.abs(d1);
		if (d1 > 0) d2 *= -1;
		var inc = (Math.abs(d2) < Math.abs(d1)) ? d2 : d1;
		return this.getNextKey(pitch, inc);
	};

	NoteUtils.getKeyPosition = function(key, pitches) {
		for (var i = 0; i < pitches.length; i++) {
			if (pitches[i] == key) break;
		}
		return i;
	};
	NoteUtils._parseNote = function(note, parseAccidental) {
		var noteParts = note.split("/");
		var noteObj = {
			octave: parseInt(noteParts[1], null)
		}
		var pitch = noteParts[0];
		noteObj.pitch = parseAccidental ? pitch[0] : pitch;

		if (parseAccidental) {
			noteObj.accidental = pitch.length == 2 ? pitch[1] : "";
		}
		return noteObj;
	}

	NoteUtils._getKey = function(note, inc, pitches, isChromatic) {
		var currentPos = isChromatic ? this.pitch2Number(note.pitch) : this.getKeyPosition(note.pitch, pitches);
		var newAbsPos = currentPos + inc;
		var newPos = newAbsPos % pitches.length;
		if (newPos < 0) newPos += pitches.length;

		var octavesInc = Math.floor(newAbsPos / pitches.length);
		var newOctave = note.octave + octavesInc;
		//range: from e/3 to f/6
		if (newOctave <= 1 && newPos < 2 || newOctave >= 7 && newPos > 3) return null;
		else return {
			pitch: pitches[newPos],
			octave: newOctave
		}
	};
	NoteUtils.getNextKey = function(key, inc) {
		var note = this._parseNote(key, true);
		var newNote = this._getKey(note, inc, this.PITCH_CLASSES, false);
		if (newNote) {
			return newNote.pitch + note.accidental + "/" + newNote.octave;
		}
	}
	NoteUtils.getNextChromaticKey = function(key, inc, withoutOctave) {
			var note = this._parseNote(key);
			var pitches = inc > 0 ? this.ASC_CHROMATIC_PITCHES : this.DESC_CHROMATIC_PITCHES;
			var newNote = this._getKey(note, inc, pitches, true);
			if (newNote) {
				return withoutOctave ? newNote.pitch : newNote.pitch + "/" + newNote.octave;
			}
		}
		/**
		 * @param  {Number}		4.5, 
		 * @param  {Number}		0.5
		 * @return {Array}		array of notes
		 */
	NoteUtils.durationToNotes = function(duration, initBeat) {

		var durs = ["w", "h", "q", "8", "16", "32", "64"];

		function findDur(arrNotes, indexes, duration) {
			arrNotes = arrNotes || [];
			indexes = indexes || [];
			var matchedDur = 4;
			var iDur = 0;
			while (iDur <= durs.length) {
				if (duration == matchedDur) {
					arrNotes.push(durs[iDur]);
					indexes.push(iDur);
					break;
				} else if (duration > matchedDur) {
					arrNotes.push(durs[iDur]);
					indexes.push(iDur);
					arrNotes = findDur(arrNotes, indexes, duration - matchedDur);
					break;
				}
				iDur++;
				matchedDur /= 2;
			}
			return {
				notes: arrNotes,
				indexes: indexes
			}
		}

		function mergeByDot(notes, indexes) {
			var mergedNotes = [],
				dot = 0,
				curIndex, prevIndex,
				curNote, prevNote;

			for (var i = notes.length - 1; i > 0; i--) {
				curIndex = indexes[i];
				prevIndex = indexes[i - 1];

				if (curIndex - 1 === prevIndex) {
					if (dot === 0) {
						dot++;
						notes[i - 1] += ".";
					} else if (dot === 1) {
						dot++;
						notes[i - 1] += "..";
					} else {
						dot = 0;
						mergedNotes.push(notes[i]);
					}
				} else {
					mergedNotes.push(notes[i]);
				}
			}
			mergedNotes.push(notes[i]);
			return mergedNotes;
		}

		var notes = [];
		var indexes = [];
		findDur(notes, indexes, duration);
		// console.log(notes);
		// console.log(indexes);
		notes = mergeByDot(notes, indexes);

		return notes;
	};
	NoteUtils.roundBeat = function(beat) {
		return Math.round(beat * 1000000) / 1000000;
	};

	return NoteUtils;
});