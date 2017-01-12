define([
	'jquery',
	'modules/core/src/NoteModel', 
	'utils/NoteUtils', 
	'modules/core/src/SongBarsIterator',
	'modules/core/src/NotesIterator',
	'modules/core/src/KeySignatureModel',
	'modules/core/src/BarAccidentals'
	], function($, NoteModel, NoteUtils, SongBarsIterator, NotesIterator, KeySignatureModel, BarAccidentals) {
	/**
    * Note manager represents list of notes, it's a component of SongModel
    * @exports core/NoteManager
    */
	function NoteManager() {
		this.notes = [];
	}

	// Interface functions (this functions are also in ChordManagerModel)

	/**
	 * @interface getTotal
	 */
	NoteManager.prototype.getTotal = function() {
		return this.notes.length;
	};
	/**
	 * returns duration in number of beats
	 * @param  {Integer} pos1
	 * @param  {Integer} pos2
	 * @return {float}
	 */
	NoteManager.prototype.getTotalDuration = function(pos1, pos2) {
		var notes = this.getNotes(pos1, pos2);
		var totalDur = 0;
		notes.forEach(function(note) {
			totalDur += note.getDuration();
		});
		return NoteUtils.roundBeat(totalDur);
	};

	NoteManager.prototype.addNote = function(note, pos) {
		if (!(note instanceof NoteModel)) throw "note is not an instance of Note";
		if (pos === undefined) {
			this.notes.push(note);
		} else { //check
			this.notes.splice(pos, 0, note);
		}
	};
	/**
	 * @param  {integer} by default 0
	 * @return {NoteModel}
	 */
	NoteManager.prototype.getNote = function(pos) {
		pos = pos || 0;
		return this.notes[pos];
	};

	NoteManager.prototype.deleteNote = function(pos) {
		if (typeof pos === "undefined") throw "pos undefined. Can't delete note";
		var notes = this.getNotes();
		this.notes.splice(pos, 1);
	};

	/**
	 * gets notes (by reference. To clone use cloneElems)
	 * @param  {Integer} from :  index, if not specified, 0
	 * @param  {Integer} to   :  index, first note that is not taken, e.g if to = 4, notes will be taken from 'from' to 3.
	 * @return {Array}   array of NoteModel
	 */
	NoteManager.prototype.getNotes = function(from, to) {
		return this.notes.slice(from, to);
	};

	/**
	 * [setNotes description]
	 * @param {Array} notes array of NoteModel
	 */
	NoteManager.prototype.setNotes = function(notes) {
		if (typeof notes !== "undefined") this.notes = notes;
	};

	/**
	 * @interface cloneElems
	 * returns a copy of the notes from, pos1, to pos2.
	 * @param  {Integer} pos1 if not specified, 0
	 * @param  {Integer} pos2 first note that is not taken, e.g if to = 4, notes will be taken from 'from' to 3.
	 * @return {Array}  array of cloned NoteModel
	 */
	NoteManager.prototype.cloneElems = function(pos1, pos2) {
		var newNotes = [];
		var notesToClone = this.getNotes(pos1, pos2);
		var note;
		notesToClone.forEach(function(note) {
			newNotes.push(note.clone());
		});
		return newNotes;
	};

	/**
	 * replace notes from pos1 to pos2+1, by default will always replace one note, if we want to insert notes at
	 * position pos without replacing note at 'pos' (e.g. in StructureEditionController.addBar()) we need to call it with cursor = [pos, pos -1 ]
	 * @param  {Array} cursor       [pos1,pos2]
	 * @param  {Array} notesToPaste array of NoteModel
	 */
	NoteManager.prototype.notesSplice = function(cursor, notesToPaste) {
		var part1 = this.notes.slice(0, cursor[0]);
		var part2 = this.notes.slice(cursor[1] + 1, this.notes.length); //selected notes are removed
		var copyArr = [];
		for (var i = 0, c = notesToPaste.length; i < c; i++) copyArr.push(notesToPaste[i].clone());
		this.notes = part1.concat(copyArr, part2);
	};

	/**
	 * Adds notes in a given position (special case of noteSplice)
	 * @param {Array} notes Array of NoteModel
	 * @param {Integer} position
	 */
	NoteManager.prototype.addNotes = function(notes, position) {
		if (position === undefined) {
			position = this.notes.length;
		}
		this.notesSplice([position, position - 1], notes);
	};
	/**
	 * returns the global beat of a note specified by its index (starting at 1)
	 * @param  {Integer} index of the note
	 * @return {Float}   beat
	 */
	NoteManager.prototype.getNoteBeat = function(index) {
		if (typeof index === "undefined" || isNaN(index) ||
			index >= this.notes.length || index < 0) {
			throw "NoteManager - getNoteBeat: problem with index " + index;
		}
		var noteBeat = 1, // because beats are based on 1
			i;
		for (i = 0; i < index; i++) {
			noteBeat += this.notes[i].getDuration();
		}
		return NoteUtils.roundBeat(noteBeat);
	};

	/**
	 *
	 * @return {Array} array of pitches of all the notes. e.g.  ["Db/4-q", "E/4-q", "F/4-8", "A#/4-4", "C/5-4", "B/4-q"]
	 */
	NoteManager.prototype.getNotesAsString = function() {
		var arrPitches = [];
		this.notes.forEach(function(note) {
			arrPitches.push(note.toString());
		});
		return arrPitches;
	};


	/**
	 * FUNCTION DOES NOT WORK AS EXPECTED
	 * @param  {NoteModel} note
	 * @return {Integer}
	 */
	NoteManager.prototype.getNoteIndex = function(note) {
		if (typeof note !== "undefined" && note instanceof NoteModel) {
			console.warn('getNoteIndex does not work as expected');
			for (var i = 0; i < this.notes.length; i++) {
				if (JSON.stringify(this.notes[i].serialize(true)) === JSON.stringify(note.serialize(true))) {
					return i;
				}
			}
		}
		return undefined;
	};

	NoteManager.prototype.getIndexesBetweenBarNumbers = function(barNum1, barNum2, song) {
		if (!song) {
			throw "NoteManager - getNotesBetweenBarNumbers - missing parameter song";
		}
		var barMng = song.getComponent('bars');
		var startBeat = song.getStartBeatFromBarNumber(barNum1);
		var endBeat = (barMng.getTotal() - 1 === barNum2) ? null : song.getStartBeatFromBarNumber(barNum2 + 1);
		return this.getIndexesStartingBetweenBeatInterval(startBeat, endBeat);
	};
	NoteManager.prototype.getNotesBetweenBarNumbers = function(barNum1, barNum2, song) {
		var indexes = this.getIndexesBetweenBarNumbers(barNum1, barNum2, song);
		return this.getNotes(indexes[0], indexes[1]);
	};

	/**
	 * @param  {SongBarsIterator} songIt iterator, contains info about which is the current bar
	 * @return {Array}        of NoteModels
	 */
	NoteManager.prototype.getNotesAtCurrentBar = function(songIt) {
		var beatIntervals = songIt.getStartEndBeats();
		var idxs = this.getIndexesStartingBetweenBeatInterval(beatIntervals[0], beatIntervals[1]);
		return this.getNotes(idxs[0], idxs[1]);
	};
	/**
	 * @param  {Number} barNumber 
	 * @param  {SongModel} song      
	 * @return {Array}  of NoteModels
	 */
	NoteManager.prototype.getNotesAtBarNumber = function(barNumber, song) {
		if (!song) {
			throw "NoteManager - getNotesAtBarNumber - incorrect song parameter";
		}
		var songIt = new SongBarsIterator(song);
		songIt.setBarIndex(barNumber);
		return this.getNotesAtCurrentBar(songIt);
	};
	/**
	 * Clones notes at a given bar number
	 * @param  {Number} barNumber 
	 * @param  {SongModel} song      
	 * @return {Object} 	{
	 *         					notes: {Array of NoteModels}, 
	 *                          idxs: [idxStart, idxEnd] 
	 *                      }
	 */
	NoteManager.prototype.cloneNotesAtBarNumber = function(barNumber, song) {
		var songIt = new SongBarsIterator(song);
		songIt.setBarIndex(barNumber);
		var beatIntervals = songIt.getStartEndBeats();
		var idxs = this.getIndexesStartingBetweenBeatInterval(beatIntervals[0], beatIntervals[1]);
		return {
			notes: this.cloneElems(idxs[0], idxs[1]),
			idxs: idxs
		};
	};
	NoteManager.prototype.getNoteBeatInBarNumber = function(noteNumber, barNumber, song) {
		var songIt = new SongBarsIterator(song);
		songIt.setBarIndex(barNumber);
		var noteBeat = this.getNoteBeat(noteNumber);
		var barBeatIntervals = songIt.getStartEndBeats();
		return 1 + noteBeat - barBeatIntervals[0];
	};

	NoteManager.prototype.play2score = function(song,start, end) {
		var playingNoteAcc, //current accidental
			newNote,
			storedAcc,
			note,
			needToResetAccidentals = false,
			barAcc = new BarAccidentals();
		var notesIt = this._getNotesIteratorAt(start, song);
		notesIt.setStart(notesIt.iFirstNoteBar);
		var newNoteMng = new NoteManager();

		while(notesIt.lowerThan(end)){
			note = this.notes[notesIt.index];
			if (notesIt.index < start ){
				barAcc.updateAccidentals(note);
			}
			else{
				var keySignature = new KeySignatureModel(notesIt.songIt.getBarKeySignature());
				newNote = note.clone();
				playingNoteAcc = note.getAccidental();
				storedAcc = barAcc.getAccidental(note) || keySignature.getPitchAccidental(note.getPitchClass());
				if (!newNote.isRest) {
					if (playingNoteAcc){
						if (playingNoteAcc == storedAcc){
							newNote.setAccidental("");
						}else{
							barAcc.updateAccidentals(newNote);
						}
					}else{
						if (storedAcc && storedAcc != "n"){
							newNote.setAccidental("n");
							barAcc.updateAccidentals(newNote);
						}
					}
				}
				newNoteMng.addNote(newNote);
			}
			notesIt.next();
			if (notesIt.isNewBar){
				needToResetAccidentals = true;
			}
			if (needToResetAccidentals && !newNote.isTie("start")){
				barAcc.reset();
				needToResetAccidentals = false;
			}
		}
		return newNoteMng;
	};

	NoteManager.prototype.score2play = function(song, start, end) {
		start = start || 0;
		end = end || this.getTotal();

		var accidental, //current accidental
			newNote,
			note,
			needToResetAccidentals = false,
			barAcc = new BarAccidentals();
		
		var notesIt = this._getNotesIteratorAt(start, song);
		notesIt.setStart(notesIt.iFirstNoteBar);
		var newNoteMng = new NoteManager();

		while (notesIt.lowerThan(end)){
			note = this.notes[notesIt.index];
			accidental = barAcc.updateAccidentals(note);

			if (notesIt.index >= start){
				newNote = note.clone();
				if (!newNote.isRest) {
					accidental = accidental || barAcc.getAccidental(note);	
									
					if (!accidental){
						var keySignature = new KeySignatureModel(notesIt.songIt.getBarKeySignature());	
						accidental = keySignature.getPitchAccidental(note.getPitchClass());
					}
					if (accidental) {
						if (accidental == "n"){
							accidental = "";
						} 	
						newNote.setAccidental(accidental);
					}
				}
				newNoteMng.addNote(newNote);
			}
			notesIt.next();
			if (notesIt.isNewBar){
				needToResetAccidentals = true;
			}
			if (needToResetAccidentals && !newNote.isTie("start")){
				barAcc.reset();
				needToResetAccidentals = false;
			}
		}
		return newNoteMng;

	};
	/**
	 * checks if there are whole rests, used to update durations (to cover the case where there is a lonely whole rest note in a bar: note's duration is the bar duration)
	 * @return {Boolean}                
	 */
	NoteManager.prototype.containsWholeRests = function() {
		for (var i = 0; i < this.notes.length; i++) {
			var note = this.notes[i];
			if (note.isRest && note.duration === "w"){
				return true;
			}
		}
		return false;
	};
	NoteManager.prototype._getNotesIteratorAt = function(index, song) {
		if (isNaN(index) || index < 0 || song === undefined) {
			throw "NoteManager - getNoteBarNumber - attributes are not what expected, song: " + song + ", index: " + index;
		}
		var duration = 0,
			songIt = new SongBarsIterator(song),
			notesIt = new NotesIterator(songIt, this);

		notesIt.setStart(index);
		return  notesIt;
	};
	/**
	 * @param  {Number} index 
	 * @param  {SongModel} song  
	 * @return {Number}       
	 */
	NoteManager.prototype.getNoteBarNumber = function(index, song) {

		return this._getNotesIteratorAt(index, song).songIt.getBarIndex();
	};

	/**
	 * @param  {integer} start
	 * @param  {integer} end
	 * @return {Array}
	 */
	NoteManager.prototype.getBeatIntervalByIndexes = function(start, end) {
		if (typeof start === "undefined" || isNaN(start) ||
			start >= this.notes.length || start < 0) {
			throw "NoteManager - getBeatIntervalByIndexes:  problem with start " + start;
		}
		if (typeof end === "undefined" || isNaN(end) ||
			end >= this.notes.length || end < 0) {
			throw "problem with end " + end;
		}
		var startBeat = this.getNoteBeat(start);
		var endBeat = this.getNoteBeat(end) + this.getNote(end).getDuration();
		endBeat = NoteUtils.roundBeat(endBeat);
		return [startBeat, endBeat];
	};
	/**
	 * abstraction of code used by both getNextIndexNoteByBeat and getPrevIndexNoteByBeat
	 * @param  {Integer} beat    Global beat from where you want informations
	 * @return {Object}         Return an object that contain index and curBeat parameter
	 */
	NoteManager.prototype._getIndexAndCurBeat = function(beat) {
		var i = 0,
			curNote,
			curBeat = 1;
		//we round in the comparison in order to not carry the rounding in curBeat (which is cumulative inside the iteration)
		while (NoteUtils.roundBeat(curBeat) < beat) { //to avoid problems with tuplet 
			curNote = this.getNote(i);
			if (curNote === undefined) {
				// throw 'NoteManager - _getIndexAndCurBeat - Note not found (possibly beat is greater than last note beat)';
				return {
					index: undefined,
					curBeat: NoteUtils.roundBeat(curBeat)
				};
			}
			curBeat += curNote.getDuration();
			i++;
		}
		return {
			index: i,
			curBeat: NoteUtils.roundBeat(curBeat)
		};
	};
	/**
	 * Returns the index of the note found at the exact beat, and if not, at the
	 * closest note just after a given beat
	 * @param  {float} beat global beat (first beat starts at 1, not 0)
	 * @return {Integer} index of the note
	 * TODO: optimisation: accept object with cached index and beat to start from, useful when function is called in loops (iterator)
	 */
	NoteManager.prototype.getNextIndexNoteByBeat = function(beat) {
		if (isNaN(beat) || beat < 1) {
			throw 'NoteManager - getNextIndexNoteByBeat - beat must be a positive float greater than 1 ' + beat;
		}
		return this._getIndexAndCurBeat(beat).index;
	};


	/**
	 * Similar to previous one (getNextIndexNote()), but if
	 * exact beat is not found, it returns the closest previous note
	 * @param  {float} beat global beat (first beat starts at 1, not 0)
	 * @param  {ifExactExclude} if note with index X starts at beat, we will not include it, we'll return index X-1
	 *
	 * @return {Integer} index of the note
	 */
	NoteManager.prototype.getPrevIndexNoteByBeat = function(beat, ifExactExclude) {
		if (isNaN(beat) || beat < 0) {
			throw 'NoteManager - getPrevIndexNoteByBeat - beat must be a positive float ' + beat;
		}
		var r = this._getIndexAndCurBeat(beat);
		var index;
		if (r.curBeat === beat) { //returned r.curBeat is already rounded (so 40.0000003 is -> 40)
			index = ifExactExclude ? r.index - 1 : r.index;
		} else {
			index = r.index - 1;
		}
		return index;
	};

	/**
	 * gets indexes of the notes who's start is between startBeat and endBeat
	 * @param  {Integer} startBeat
	 * @param  {Integer} endBeat
	 * @param {Boolean} ifExactExlude, default is false. 
	 *                                 ex: to get all notes of bar 1 we should do getIndexesStartingBetweenBeatInterval(1,5,true) or getIndexesStartingBetweenBeatInterval(1,4.99)
	 *                                 normally we want to not exclude because function getNotes(start,end) already excludes 'end' index and gets notes until end - 1
	 * @return {Array}           indexes e.g. [1,2]
	 */

	NoteManager.prototype.getIndexesStartingBetweenBeatInterval = function(startBeat, endBeat, ifExactExclude) {

		if (isNaN(startBeat) || startBeat < 0) {
			startBeat = 1;
		}
		if (isNaN(endBeat)) {
			throw 'NoteManager - getIndexesStartingBetweenBeatInterval - endBeat must be a positive integer ' + endBeat;
		}
		var index1 = this.getNextIndexNoteByBeat(startBeat);
		var index2;
		if (endBeat > this.getTotalDuration() || endBeat == null) { // important ==, to be true if null or undefined
			index2 = ifExactExclude ? this.getTotal() - 1 : this.getTotal();
		} else {
			index2 = this.getPrevIndexNoteByBeat(endBeat, ifExactExclude); //ifExactExclude is true, that means that we wont return note starting exactly at endBeat
		}

		if (index1 > index2) index1 = index2; //if startBeat and endBeat are within a note, the indexes will be [x,x-1], we fix it here

		return [index1, index2];
	};

	NoteManager.prototype.getStartTieNotePos = function(pos) {
		while (pos !== 0 &&
			(this.notes[pos].getTie() === 'stop' || this.notes[pos].getTie() ==='stop_start' ||  //current pos is in tie but not start
			this.notes[pos - 1].getTie() ==='stop_start' || this.notes[pos - 1].getTie() ==='start')) //previous pos is in tie but or start (this handles cases where there is a tie start and following note has no tie stopm we assume it should)
		{
			pos--;
		}
		return pos;
	};

	/**
	 *
	 * @param  {Array | Number} durations array of durations corresponding to bars divisions
	 */

	NoteManager.prototype.fillGapWithRests = function(durations) {
		var newNote;
		var rests = [],
			silenceDurs = [],
			self = this;

		if (!Array.isArray(durations)) {
			durations = [durations];
		}

		durations.forEach(function(duration) {
			silenceDurs = NoteUtils.durationToNotes(duration);
			if (silenceDurs[0] !== undefined) {
				silenceDurs.forEach(function(dur) {
					newNote = new NoteModel(dur + 'r');
					self.addNote(newNote);
				});
			}

		});
	};
	NoteManager.prototype.onlyRests = function() {

		for (var i = 0; i < this.notes.length; i++) {
			if (!this.notes[i].isRest) {
				return false;
			}
		}
		return true;
	};

	/**
	 * This function is called in a temporal NoteManager with selected notes in a time signature change (from StructureEditionController) 
	 * so notes are adapted to only one time signature (no time signature changes)
	 * @param  {TimeSignatureModel} timeSig 
	 * @param  {integer} numBars number of bars to change, used when there are only rests, when there are notes, numBars can be undefined
	 * @return {Array}         of NoteModel
	 */
	NoteManager.prototype.getNotesAdaptedToTimeSig = function(timeSig, numBars) {
		var newNoteMng = new NoteManager();
		var numBeatsBar = timeSig.getQuarterBeats();

		var i;
		if (this.onlyRests()) {
			var divisions = [];
			for (i = 0; i < numBars; i++) {
				divisions.push(timeSig.getQuarterBeats());
			}
			newNoteMng.fillGapWithRests(divisions);
		} else {
			var accDuration = 0; //accumulated Duration
			var note, newNote;
			for (i = 0; i < this.notes.length; i++) {
				note = this.notes[i];
				accDuration += note.getDuration();
				if (NoteUtils.roundBeat(accDuration) == numBeatsBar && i < this.notes.length - 1) {
					accDuration = 0;
					newNoteMng.addNote(note);
				} else if (NoteUtils.roundBeat(accDuration) > numBeatsBar) {
					var diff = NoteUtils.roundBeat(accDuration) - numBeatsBar;
					note.setDurationByBeats(note.getDuration() - diff);
					note.setTie('start');
					newNoteMng.addNote(note);
					newNote = note.clone();
					newNote.setDurationByBeats(diff);

					newNote.removeTie();
					newNote.setTie('stop');
					newNoteMng.addNote(newNote);

					accDuration = diff;

				} else {
					newNoteMng.addNote(note);
				}
			}
			var startingBeat = newNoteMng.getTotalDuration() + 1; //beat is 1 based
			var gapDuration = numBeatsBar - accDuration;
			newNoteMng.fillGapWithRests(gapDuration);
		}
		return newNoteMng.getNotes();
	};
	/**
	 * if there are ties that with different pitches, we remove the tie
	 */
	NoteManager.prototype.reviseTiesPitch = function() {
		var notes = this.notes;
		var note, notes2;
		for (var i = 0; i < notes.length - 1; i++) {
			note = notes[i];
			note2 = notes[i + 1];
			if (note.isTie('start') && note2.isTie('stop') && note.getPitch() != note2.getPitch()) {
				note.removeTie(note.getTie());
				note2.removeTie(note2.getTie());
			}
		}
	};
	/**
	 * @param  {Array} pos cursor position e.g. [0,2]
	 * @return {Array|null}     search on left then right, then if nothing is found it return null
	 */
	NoteManager.prototype.findRestAreas = function(pos) {

		//only merge non tuplet rests
		function expandableRest(note) {
			return note && note.isRest && !note.isTuplet();
		}
		//merge areas if they are touching each other
		function mergeAreas(area1, area2) {
			var mergedAreas;
			if (area1 && area2 && area1[1] == area2[0] - 1) {
				mergedAreas = [area1[0], area2[1]];
			} else {
				mergedAreas = area1 || area2;
			}
			return mergedAreas;
		}

		var start = pos[0],
			end = pos[1],
			iLeft,
			iRight;

		//outer left area (out of cursor position) if there are rests
		var outerLeftArea = null;
		if (start > 0) {
			iLeft = start - 1;
			if (expandableRest(this.notes[iLeft])) {
				outerLeftArea = [];
				outerLeftArea[1] = iLeft;
				while (iLeft >= 0 && expandableRest(this.notes[iLeft])) {
					outerLeftArea[0] = iLeft;
					iLeft--;
				}
			}
		}
		// outerLeftArea will be :
		//				like [x, y] (being x first index and y last index), 
		// 				or 
		//				null if no area found

		//outer right area
		var outerRightArea = null;
		if (end < this.getTotal() - 1) {
			iRight = end + 1;
			if (expandableRest(this.notes[iRight])) {
				outerRightArea = [];
				outerRightArea[0] = iRight;
				while (iRight < this.getTotal() && expandableRest(this.notes[iRight])) {
					outerRightArea[1] = iRight;
					iRight++;
				}
			}
		}
		//inner left area (inside cursor) if there are rests
		var innerLeftArea = null;
		iLeft = start;
		if (expandableRest(this.notes[iLeft])) {
			innerLeftArea = [];
			innerLeftArea[0] = iLeft;
			while (iLeft <= end && expandableRest(this.notes[iLeft])) {
				innerLeftArea[1] = iLeft;
				iLeft++;
			}
		}
		//inner right area
		var innerRightArea = null;
		iRight = end;
		var limit = innerLeftArea ? innerLeftArea[1] : start;
		if (expandableRest(this.notes[iRight]) && iRight > limit) {
			innerRightArea = [];
			innerRightArea[1] = iRight;
			while (iRight > limit && expandableRest(this.notes[iRight])) {
				innerRightArea[0] = iRight;
				iRight--;
			}
		}

		var leftArea = mergeAreas(outerLeftArea, innerLeftArea);
		var rightArea = mergeAreas(innerRightArea, outerRightArea);

		if (leftArea && rightArea) {
			if (leftArea[1] == rightArea[0] - 1) {
				return [
					[leftArea[0], rightArea[1]]
				];
			} else {
				return [
					leftArea,
					rightArea
				];
			}
		} else {
			return leftArea ? [leftArea] : rightArea ? [rightArea] : null;
		}
	};

	/**
	 * this function is called after deleting a note or copy and pasting notes, to check if there is a malformed tuplet or a malformed tie
	 * if it does, it deletes the tie or the tuplet
	 */
	NoteManager.prototype.reviseNotes = function() {

		function getRemoveSet(input, i) {
			var min = i;
			var max = i;
			while (min > 0 && input[min - 1] != "no") {
				min--;
			}
			while (max + 1 < input.length && input[max + 1] != "no") {
				max++;
			}
			return {
				min: min,
				max: max
			};
		}

		/**
		 * This function parses input controling that all transitions are valid,
		 * if it finds a problem, removes the property that causes the error
		 *
		 * @param  {Array} notes          Array of NoteModel, notes to modify
		 * @param  {Object} graph          tranistion graph represents valid transitions
		 * @param  {Array}  input          array of states, taken from notes
		 * @param  {Function} removeFunction function to remove property
		 */
		function parser(notes, graph, input, removeFunction) {
			var prevState, currState;
			var isTie = [];
			var states = Object.keys(graph);
			var iToStartRemoving;
			var intervalsToRemove = [];
			for (var i = 0; i < input.length; i++) {
				prevState = (i < 1) ? "no" : input[i - 1];
				currState = (i == input.length) ? "no" : input[i];
				if ($.inArray(prevState, states) == -1) {
					throw "value " + prevState + "(position " + i + ") not specified on transitions graph";
				}
				if ($.inArray(currState, graph[prevState]) == -1) {
					var iToStartRemove = (currState == "no") ? i - 1 : i;
					intervalsToRemove.push(getRemoveSet(input, iToStartRemove));
				}
			}

			var max, min;
			for (var i in intervalsToRemove) {
				max = intervalsToRemove[i].max;
				min = intervalsToRemove[i].min;

				for (var j = min; j <= max; j++) {
					NoteModel.prototype[removeFunction].call(notes[j], notes[j].tie);
				}
			}

		}

		function checkTuplets(notes) {
			var note;
			var states = [];
			var state;
			for (var i = 0; i < notes.length; i++) {
				note = notes[i];
				state = note.getTuplet() || "no";
				states.push(state);
			}
			parser(notes, {
					"no": ["no", "start"],
					"start": ["middle"],
					"middle": ["stop"],
					"stop": ["start", "no"]
				}, states,
				"removeTuplet"
			);
		}

		function checkTies(notes) {
			var note;
			var states = [];
			var state;
			for (var i = 0; i < notes.length; i++) {
				note = notes[i];
				state = note.getTie() || "no";
				states.push(state);
			}
			parser(notes, {
					"no": ["no", "start"],
					"start": ["stop", "stop_start"],
					"stop_start": ["stop", "stop_start"],
					"stop": ["start", "no"]
				}, states,
				"removeTie"
			);

		}
		checkTuplets(this.notes);
		checkTies(this.notes);
	};

	return NoteManager;
});