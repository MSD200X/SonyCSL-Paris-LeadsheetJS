	/**
	 * Chord manager represents a list of chords, it's a component of SongModel
	 * @exports core/ChordManager
	 */
	define([
		'modules/core/src/ChordModel',
		'modules/core/src/SongBarsIterator'
	], function(ChordModel, SongBarsIterator) {
		function ChordManager(chords) {
			this.chords = chords ? chords : []; // array of chordModel
		}

		/**
		 * Interface functions (this functions are also in NoteManagerModel  )
		 * @interface getTotal
		 */
		ChordManager.prototype.getTotal = function() {
			return this.chords.length;
		};

		ChordManager.prototype.isEmpty = function() {
			return this.chords.length === 0;
		};

		ChordManager.prototype.getChords = function(from, to) {
			return this.chords.slice(from, to);
		};

		ChordManager.prototype.setAllChords = function(chords) {
			this.chords = chords;
		};

		ChordManager.prototype.getChord = function(index) {
			if (typeof index !== "undefined" && !isNaN(index)) {
				if (this.chords[index]) {
					return this.chords[index];
				}
			}
			return undefined;
		};

		ChordManager.prototype.getChordIndex = function(chord) {
			if (typeof chord === "undefined" || !(chord instanceof ChordModel)) {
				throw 'Chord must be a ChordModel';
			}
			for (var i = 0, c = this.chords.length; i < c; i++) {
				if (JSON.stringify(this.getChord(i)) === JSON.stringify(chord)) {
					return i;
				}
			}
			return undefined;
		};


		/**
		 * @param  {SongModel} song 
		 * @return {Array}      Array in which each position corresponds the chord index, and the value is the beat number. e.g
		 *                      for song like  4/4| Gm C7 | Dm G7 |(3/4) CM7 | FM7  values would be [1, 3, 5, 7, 9, 12]
		 */
		ChordManager.prototype.getBeatsBasedChordIndexes = function(song) {
			var indexesChords = [];
			var songIt = new SongBarsIterator(song);
			var barEndBeat;
			var barStartBeat = 1;
			var iBar, beat;
			var iChord = 0;
			var offsetBar, chord, beatInc;
			while (songIt.hasNext()) {
				//barEndBeat = barStartBeat + songIt.getBarTimeSignature().getQuarterBeats();
				iBar = songIt.getBarIndex();
				beatInc = 4 / songIt.getBarTimeSignature().getBeatUnit();

				while (iChord < this.chords.length && this.chords[iChord].getBarNumber() <= iBar) {
					chord = this.chords[iChord];
					offsetBar = (chord.getBeat() - 1) * beatInc;
					beat = barStartBeat + offsetBar;
					indexesChords[iChord] = beat;
					iChord++;
				}
				barStartBeat += songIt.getBarTimeSignature().getQuarterBeats();
				songIt.next();
				offsetBar = 0;
			}
			return indexesChords;
		};
		/**
		 * @param  {SongModel} song          
		 * @param  {Number} startBeat     
		 * @param  {Number} endBeat       
		 * @param  {Array} arrBeatChords, array representing the starting beat of all chords in a song. 
		 *                               If not specified, it's calculated inside the function
		 * @return {Array}               Array of objects representing chords between startBeat and endBeat in the 
		 *                               following format: {index: 0, beat: 1}, where index is the global chord index, and beat is the beat offset from startBeat, so it is 0 based
		 */
		ChordManager.prototype.getChordsRelativeToBeat = function(song, startBeat, endBeat, arrBeatChords) {
			arrBeatChords = arrBeatChords || this.getBeatsBasedChordIndexes(song);
			endBeat = endBeat || startBeat;
			var selectedChords = [];
			for (var i = 0; i < arrBeatChords.length; i++) {
				if (arrBeatChords[i] >= endBeat && arrBeatChords[i-1] < startBeat) {
					selectedChords.push({
						index: arrBeatChords[i] === endBeat ? i : i - 1,
						beat: 1
					});
				} else if (arrBeatChords[i] >= startBeat && arrBeatChords[i] < endBeat) {
					selectedChords.push({
						index: i,
						beat: arrBeatChords[i] - startBeat
					});
				} 
			}
			return selectedChords;
		};

		/**
		 * @param  {SongModel} song
		 * @return {ChordModel}
		 */
		ChordManager.prototype.getChordForBeat = function(song, beat){
			var chordIndexAndBeat = this.getChordsRelativeToBeat(song, beat, beat);
			return chordIndexAndBeat.length === 1 ? this.chords[chordIndexAndBeat[0].index] : false;	
		};

		/**
		 * @param  {SongModel} song 
		 * @param  {Number} beat 	represents beat number in 'quarter beats'
		 * @return {Object}       {beatNumber:1, barNumber:1}
		 */
		ChordManager.prototype.getBarNumAndBeatFromBeat = function(song, beat) {
			if (!beat){
				throw "ChordManager - getBarNumAndBeatFromBeat: wrong parameters";
			}
			var songIt = new SongBarsIterator(song);
			var startBeat = 1;
			var endBeat, incBeat, offset;
			while (songIt.hasNext()) {
				endBeat = startBeat + songIt.getBarTimeSignature().getQuarterBeats();
				if (endBeat > beat) {
					offset = beat - startBeat;
					incBeat = 4 / songIt.getBarTimeSignature().getBeatUnit();
					
					return {
						beatNumber: Math.round(offset / incBeat) + 1,
						barNumber: songIt.getBarIndex(),
						notExactBeat: offset !== parseInt(offset, 10) //if offset is not integer, it means that 'beat' is not starting at an exact beat of bar
					};
				}
				songIt.next();
				startBeat = endBeat;
			}
			return {
				exceedsSongLength: true
			};

		};

		/**
		 * Set a new chord to a specific index, if chords[index] already have a chord it will replace it
		 * @param {ChordModel} chord
		 * @param {int} index
		 */
		ChordManager.prototype.setChord = function(chord, index) {
			if (typeof chord === "undefined" || !(chord instanceof ChordModel) || typeof index === "undefined" || isNaN(index) || index < 0) {
				throw 'Wrong Parameters';
			}
			this.chords[index] = chord;
		};

		/**
		 * Add a new chord at the end of chords array, if chord is not set, it create a new instance of chordModel
		 * @param {ChordModel} chord
		 */
		ChordManager.prototype.addChord = function(chord) {
			if (typeof chord !== "undefined" && chord instanceof ChordModel) {
				this.chords.push(chord);
			} else {
				this.chords.push(new ChordModel());
			}
			this._sortChordsList();
		};

		/**
		 * Search and remove a chord from the array, chordModel is destroyed
		 * @param  {ChordModel} chord
		 */
		ChordManager.prototype.removeChord = function(chord) {
			if (typeof chord !== "undefined" && !(chord instanceof ChordModel)) {
				throw 'Chord must be a ChordModel';
			}
			var chordIndex = this.getChordIndex(chord);
			this.removeChordByIndex(chordIndex);
		};

		/**
		 * Remove a chord from the array based on it's index, chordModel is destroyed
		 * @param  {int} index
		 */
		ChordManager.prototype.removeChordByIndex = function(index) {
			if (typeof index === "undefined" || isNaN(index) || index < 0) {
				throw 'Index must be a int in removeChordByIndex';
			}
			if (this.chords[index]) {
				var deletedChords = this.chords.splice(index, 1);
			}
		};


		/**
		 * Functions changes bar number of each chords that is equal or greater than barNumber
		 * @param  {Int} inc       Increment bar number (usually it's 1 or -1)
		 * @param  {Int} barNumber start bar from which we start to increment
		 */
		ChordManager.prototype.incrementChordsBarNumberFromBarNumber = function(inc, barNumber) {
			if (typeof barNumber !== "undefined" && !isNaN(barNumber) && barNumber >= 0) {
				var currentChord;
				for (var i = 0, c = this.chords.length; i < c; i++) {
					currentChord = this.chords[i];
					if (currentChord.getBarNumber() >= barNumber) {
						currentChord.setBarNumber(currentChord.getBarNumber() + inc);
					}
				}
			}
		};

		/**
		 * Return an array of chords that are in a bar defined by barNumber argument
		 * @param  {int} barNumber
		 */
		ChordManager.prototype.getChordsByBarNumber = function(barNumber) {
			var chordsByBarNumber = [];
			if (typeof barNumber !== "undefined" && !isNaN(barNumber) && barNumber >= 0) {
				var currentChord;
				for (var i = 0, c = this.chords.length; i < c; i++) {
					currentChord = this.chords[i];
					if (currentChord.getBarNumber() === barNumber) {
						chordsByBarNumber.push(currentChord);
					}else if (currentChord.getBarNumber() > barNumber){
						break;
					}
				}
			}
			return chordsByBarNumber;
		};

		/**
		 * Remove all chords in a bar
		 * @param  {int} barNumber
		 */
		ChordManager.prototype.removeChordsByBarNumber = function(barNumber) {
			if (typeof barNumber !== "undefined" && !isNaN(barNumber) && barNumber >= 0) {
				var currentChord;
				for (var i = this.chords.length - 1; i >= 0; i--) {
					currentChord = this.chords[i];
					if (currentChord.getBarNumber() === barNumber) {
						this.removeChordByIndex(i);
					}
				}
			}
		};
		/**
		 *
		 * Remove all chords between 2 positions
		 * @param  {int} barNumberStart [description]
		 * @param  {int} beatStart      [description]
		 * @param  {int} barNumberEnd  [description]
		 * @param  {int} beatEnd        [description]
		 */
		ChordManager.prototype.removeChordsBetweenPositions = function(barNumberStart, beatStart, barNumberEnd, beatEnd) {
			if (!isNaN(barNumberStart) && barNumberStart >= 0 && !isNaN(beatStart) && beatStart >= 1 && !isNaN(barNumberEnd) && barNumberEnd >= 0 && !isNaN(beatEnd) && beatEnd >= 1) {
				var numStart = barNumberStart * 1000 + beatStart; // bar 4 beat 3 become 4003
				var numEnd = barNumberEnd * 1000 + beatEnd; // bar 5 beat 1 become 5001
				var numCurrent;
				var currentChord;
				for (var i = this.chords.length - 1; i >= 0; i--) {
					currentChord = this.chords[i];
					numCurrent = currentChord.getBarNumber() * 1000 + currentChord.getBeat();
					if (numStart <= numCurrent && numCurrent <= numEnd) {
						this.removeChordByIndex(i);
					}
				}
			}
		};

		/**
		 * Return a chord that is matching correct Bar and beat number
		 * @param  {ChordModel} chord or undefined if no chord match
		 */
		ChordManager.prototype.searchChordByBarAndBeat = function(barNumber, beat) {
			if (!isNaN(barNumber) && barNumber >= 0 && !isNaN(beat) && beat >= 0) {
				var currentChord;
				for (var i = 0, c = this.chords.length; i < c; i++) {
					currentChord = this.chords[i];
					if (currentChord.getBarNumber() === barNumber && currentChord.getBeat() === beat) {
						return currentChord;
					}
				}
			}
			return undefined;
		};
		/**
		 * @interface cloneElems
		 *
		 * returns a copy of the chords from, pos1, to pos2.
		 * @param  {Integer} pos1
		 * @param  {Integer} pos2
		 * @return {ChordModel}      return a new Chordmodel
		 */
		ChordManager.prototype.cloneElems = function(pos1, pos2) {
			var newChords = [];
			var chordsToClone = this.getChords(pos1, pos2);
			chordsToClone.forEach(function(chord) {
				var cChord = chord.clone();
				newChords.push(cChord);
			});
			return newChords;
		};

		/**
		 * Return the duration of a chord in beat
		 * @param  {songModel} current songModel in which the chord is
		 * @param  {int} index of chord in this.chords
		 * @return {int} number of beat the chord last
		 */
		ChordManager.prototype.getChordDuration = function(songModel, index, asBeatUnitQuarter) {
			if (typeof songModel === "undefined" || typeof index === "undefined" || isNaN(index)) {
				throw "ChordManager - getChordDuration - wrong arguments";
			}
			if (typeof this.chords[index] === "undefined") {
				return undefined;
			}

			var currentBn = this.chords[index].getBarNumber();
			var currentBeat = this.chords[index].getBeat();
			var beats = songModel.getTimeSignatureAt(currentBn).getBeats();
			var nextBn, nextBeat;
			if (typeof this.chords[index + 1] !== "undefined") {
				nextBn = this.chords[index + 1].getBarNumber();
				nextBeat = this.chords[index + 1].getBeat();
			} else {
				// case last chords, we set next to the end
				var sectionNumber = songModel.getSectionNumberFromBarNumber(currentBn);
				nextBn = songModel.getStartBarNumberFromSectionNumber(sectionNumber) + songModel.getSection(sectionNumber).getNumberOfBars();
				nextBeat = 1;
			}
			var duration = 0;
			if (nextBn === currentBn) { // if chord are on the same bar
				duration = nextBeat - currentBeat;
			} else if (nextBn > currentBn) {
				duration = beats * (nextBn - currentBn) + nextBeat - currentBeat;
				// TODO test duration 2, it's probably more correct because it take into account time modification change
				// duration2 = songModel.getStartBeatFromBarNumber(nextBn-1) + songModel.getTimeSignatureAt(nextBn-1).getBeats() + nextBeat - songModel.getStartBeatFromBarNumber(currentBn) - currentBeat;
				// console.log(duration, duration2);
			}
			return asBeatUnitQuarter === true ? duration * songModel.getTimeSignatureAt(currentBn).getBeatUnitQuarter() : duration;
		};


		/**
		 * returns the index of the chord in the demanded position. If there is no chord with that exact position , it returns the closest previous one (or the following one, depending on 'next' param)
		 * returns also if it found the exact one or not
		 * @param  {Object} pos {	numBar: valNumBar,
		 *		                    numBeat: valNumBeat}
		 * @param  {boolean} next if true, when there is no chord found at the exact position we get the next one, if false or undefined, we get the previous one
		 * @return {Object} {
		 *         index: number
		 *         exact: boolean
		 * }
		 */
		ChordManager.prototype.getChordIndexByPosition = function(pos, next) {
			function equalPosition(pos, chord) {
				return pos.numBar == chord.getBarNumber() && pos.numBeat == chord.getBeat();
			}

			//greater than
			function posGtChordPos(pos, chord) {
				return pos.numBar > chord.getBarNumber() || (pos.numBar == chord.getBarNumber() && pos.numBeat > chord.getBeat());
			}

			//less than
			function posLtChordPos(pos, chord) {
				return pos.numBar < chord.getBarNumber() || (pos.numBar == chord.getBarNumber() && pos.numBeat < chord.getBeat());
			}

			var chords = this.getChords();
			var r;
			for (var i = 0, c = chords.length; i < c; i++) {
				if (equalPosition(pos, chords[i])) {
					r = "equal";
					break;
				} else if (posGtChordPos(pos, chords[i])) {
					if (i + 1 == chords.length || posLtChordPos(pos, chords[i + 1])) {
						r = "greater";
						break;
					}
				}
			}
			if (next && r != "equal") i++;
			return {
				index: i,
				exact: r == "equal"
			};
		};

		ChordManager.prototype.getChordsAsString = function() {
			var strChords = [];
			for (var i = 0; i < this.chords.length; i++) {
				strChords.push(this.chords[i].toString());
			}
			return strChords;
		};

		ChordManager.prototype._sortChordsList = function() {
			this.chords.sort(function(a, b) {
				return ((a.barNumber * 1000 + a.beat) - (b.barNumber * 1000 + b.beat));
			});
		};

		/**
		 * getBeatIntervalByIndexes return the beat interval between chords[start] and chords[end] + chords[end] duration
		 * @interface getBeatIntervalByIndexes
		 * @param  {Number} start
		 * @param  {Number} end
		 * @return {Array}
		 */
		ChordManager.prototype.getBeatIntervalByIndexes = function(songModel, start, end) {
			if (start === undefined || isNaN(start) || end === undefined || isNaN(end)) {
				throw 'Start and End parameters should be number';
			}
			var startChord = this.getChord(start);
			var endChord = this.getChord(end);
			var startBeat = songModel.getStartBeatFromBarNumber(startChord.getBarNumber()) - 1 + startChord.getBeat();
			var endBeat = songModel.getStartBeatFromBarNumber(endChord.getBarNumber()) + songModel.getTimeSignatureAt(endChord.getBarNumber()).getBeats();
			return [startBeat, endBeat];
		};

		/**
		 * Return the index of numberOfChords chords before and after the selected chords
		 * @param  {Array} cursor cursor array containing position [1,3]
		 * @param  {Integer} numberOfChords indicate how many chords you want to add on the left and right of your context
		 * @return {Array}                Return an array that contain new positions of chord
		 */
		ChordManager.prototype.getContextOfSelectedChords = function(cursor, numberOfChords) {
			var leftContext = [];
			var rightContext = [];
			for (var i = 1; i <= numberOfChords; i++) {
				if (cursor[0] - i >= 0) {
					leftContext.push(cursor[0] - i);
				}
				if (cursor[1] + i < this.chords.length) {
					rightContext.push(cursor[1] + i);
				}
			}
			return [leftContext, rightContext];
		};

		/**
		 * Function look which chords have their startbeat between startBeat and EndBeat
		 * It returns an array of 2 chords index, first index is the first chord that match, second is the last chord that match (it can be the same)
		 * by beat interval without including the last beat (just like in notes).
		 * E.g.: in a 4/4 song, with one chord per bar,  getIndexesStartingBetweenBeatInterval(1,6) would return [0,0]
		 * @interface
		 * @param  {Number} startBeat
		 * @param  {Number} endBeat
		 * @return {Array}  [indexStart, indexEnd]
		 */
		/*ChordManager.prototype.getIndexesStartingBetweenBeatInterval = function(songModel, startBeat, endBeat) {
			if (typeof startBeat === "undefined" || isNaN(startBeat) || typeof endBeat === "undefined" || isNaN(endBeat)) {
				throw 'Start and End parameters should be number';
			}
			var pos1 = songModel.getPositionFromBeat(startBeat);
			var pos2 = songModel.getPositionFromBeat(endBeat);
			var index1 = this.getChordIndexByPosition(pos1, true);
			var index2 = this.getChordIndexByPosition(pos2);
			if (index2.exact) index2.index--;
			return [index1.index, index2.index];
		};*/

		return ChordManager;
	});