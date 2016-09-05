define([
	'jquery',
	'mustache',
	'modules/Edition/src/EditionControllerInterface',
	'modules/Cursor/src/CursorModel',
	'modules/core/src/SongModel',
	'modules/core/src/SectionModel',
	'modules/core/src/NoteManager',
	'modules/core/src/NoteModel',
	'modules/core/src/SongBarsIterator',
	'modules/core/src/TimeSignatureModel',
	'modules/MidiCSL/src/converters/SongConverterMidi_MidiCSL',
	'utils/NoteUtils',
	'utils/UserLog',
	'modules/MidiCSL/utils/MidiHelper',
	'modules/core/src/Intervals',
	'modules/core/src/Note',
	'modules/core/src/PitchClass',
	'modules/Unfold/src/UnfoldingManager',
	'pubsub',
], function($, Mustache, EditionControllerInterface, CursorModel, SongModel, SectionModel, NoteManager, NoteModel, SongBarsIterator, TimeSignatureModel, SongConverterMidi_MidiCSL, NoteUtils, 
			UserLog, Midi, Intervals, Note, PitchClass, UnfoldingManager, pubsub) {
	/**
	 * StructureEditionController manages all structure edition function
	 * @exports StructureEdition/StructureEditionController
	 */
	function StructureEditionController(songModel, cursor, structEditionModel) {
		$.extend(this, new EditionControllerInterface());
		this.songModel = songModel || new SongModel();
		this.cursor = cursor || new CursorModel();
		this.initSubscribe();
		this.structEditionModel = structEditionModel;
	}

	/**
	 * Subscribe to view events
	 */
	StructureEditionController.prototype.initSubscribe = function() {
		var self = this;
		var fn;
		// All functions related with note edition go here
		$.subscribe('StructureEditionView', function(el, fn, param) {
			if (self.isEditable()) {
				self[fn].call(self, param);
				var forceNewCanvasLayer = (fn === 'addBar' || fn === 'addSection');
				$.publish('ToViewer-draw', [self.songModel, forceNewCanvasLayer]);
			}
		});
		$.subscribe('CursorModel-setPos', function(el) {
			self.setCurrentElementFromCursor();
		});
	};

	StructureEditionController.prototype.setCurrentElementFromCursor = function() {
		if (typeof this.structEditionModel === "undefined" || this.isEditable() !== true) {
			return;
		}
		var currentBarNumber = this.songModel.getComponent('notes').getNoteBarNumber(this.cursor.getStart(), this.songModel);
		var currentBar = this.songModel.getComponent('bars').getBar(currentBarNumber);
		// TODO get tonality at
		this.structEditionModel.setSelectedBarAndSignatures(
			currentBar,
			this.songModel.getKeySignatureAt(currentBarNumber),
			this.songModel.getTimeSignatureAt(currentBarNumber)
		);
		var currentSectionNumber = this.songModel.getSectionNumberFromBarNumber(currentBarNumber);
		var currentSection = this.songModel.getSection(currentSectionNumber);
		this.structEditionModel.setSelectedSection(currentSection);
	};

	StructureEditionController.prototype.addSection = function() {
		var selBars = this._getSelectedBars();
		var currentBar = selBars[0];
		var sectionNumber = this.songModel.getSectionNumberFromBarNumber(currentBar);
		var startBar = this.songModel.getStartBarNumberFromSectionNumber(sectionNumber);

		if (startBar == selBars[0]){
			UserLog.logAutoFade('error', "Cannot add new section in first bar of a Section");
			return false;
		}
		
		var section = this.songModel.getSection(sectionNumber);
		var oldTotalBars = section.getNumberOfBars();

		section.setNumberOfBars(currentBar - startBar);
		var section = new SectionModel({
			numberOfBars: startBar + oldTotalBars - currentBar
		});
		this.songModel.addSection(section, sectionNumber + 1);

		UserLog.logAutoFade('info', "Section has been added successfully");
		$.publish('ToLayers-removeLayer');
		$.publish('ToHistory-add', 'Add Section');
		//this.cursor.setPos(indexLastNote + 1);
	};

	StructureEditionController.prototype.removeSection = function() {
		var selBars = this._getSelectedBars();
		var currentBar = selBars[0];
		var sectionNumber = this.songModel.getSectionNumberFromBarNumber(currentBar);
		if (sectionNumber == 0){
			UserLog.logAutoFade('error', "You can't delete last section");
			return false;
		}

		var prevSection = this.songModel.getSection(sectionNumber - 1);
		var currSection = this.songModel.getSection(sectionNumber);
		
		prevSection.setNumberOfBars(prevSection.getNumberOfBars() + currSection.getNumberOfBars());
		this.songModel.removeSection(sectionNumber);
		
		UserLog.logAutoFade('info', "Section have been removed successfully");
		$.publish('ToLayers-removeLayer');
		$.publish('ToHistory-add', 'Remove Section');

	};

	StructureEditionController.prototype.setSectionName = function(name) {
		if (typeof name === "undefined") {
			return;
		}
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		var sectionNumber = this.songModel.getSectionNumberFromBarNumber(selBars[0]);
		this.songModel.getSection(sectionNumber).setName(name);
		$.publish('ToViewer-draw', this.songModel);
		$.publish('ToHistory-add', 'Rename Section ' + name);
	};

	// Carefull, if a section is played 2 times, repeatTimes = 1
	StructureEditionController.prototype.setRepeatTimes = function(repeatTimes) {
		if (typeof repeatTimes === "undefined") {
			return;
		}
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		var sectionNumber = this.songModel.getSectionNumberFromBarNumber(selBars[0]);
		this.songModel.getSection(sectionNumber).setRepeatTimes(repeatTimes);

		$.publish('ToHistory-add', 'Change Section repeat' + repeatTimes);

	};

	StructureEditionController.prototype.addBar = function() {
		var selBars = this._getSelectedBars();
		var numBar = 0;
		if (selBars.length !== 0) {
			numBar = selBars[0]; // add bar after current one
		}

		var nm = this.songModel.getComponent('notes');
		//get the duration of the bar, and create a new bar with silences
		var beatDuration = this.songModel.getTimeSignatureAt(numBar).getQuarterBeats();
		var newBarNm = new NoteManager(); //Create new Bar NoteManager
		
		//insert those silences
		newBarNm.fillGapWithRests(beatDuration);

		var numInsertBar = numBar + 1;
		//get numBeat from first note of current bar
		var numBeat = this.songModel.getStartBeatFromBarNumber(numInsertBar);
		// get the index of that note
		var index = nm.getNextIndexNoteByBeat(numBeat);

		// remove a possibly tied notes
		if (typeof nm.getNote(index) !== "undefined" && nm.getNote(index).isTie('stop')) {
			var tieType = nm.getNote(index).getTie();
			if (tieType === "stop") {
				nm.getNote(index).removeTie();
				var tieTypePrevious = nm.getNote(index - 1).getTie();
				if (tieTypePrevious === 'start') {
					nm.getNote(index - 1).removeTie();
				} else if (tieTypePrevious === 'start_stop') {
					nm.getNote(index - 1).setTie("stop");
				}
			} else {
				// case it's start or stop_start
				nm.getNote(index).setTie("start");
			}
		}
		nm.notesSplice([index, index - 1], newBarNm.getNotes());
		nm.reviseNotes();

		//add bar to barManager
		var barManager = this.songModel.getComponent('bars');
		barManager.insertBar(numInsertBar, this.songModel);

		// decal chords
		this.songModel.getComponent('chords').incrementChordsBarNumberFromBarNumber(1, numInsertBar);
		$.publish('ToLayers-removeLayer');
		$.publish('ToHistory-add', 'Add Bar');
	};

	/**
	 * Function deletes selected bars
	 */
	StructureEditionController.prototype.removeBar = function() {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = selBars.length - 1; i >= 0; i--) {
			this._removeBar(selBars[i]);
		}
		$.publish('ToLayers-removeLayer');
		$.publish('ToHistory-add', 'Remove Bar');
	};

	/**
	 * Function deletes bar and all it's components with index, it also delete section if it was the last bar of the section
	 */
	StructureEditionController.prototype._removeBar = function(barNumber) {
		var bm = this.songModel.getComponent('bars');
		var nm = this.songModel.getComponent('notes');
		var cm = this.songModel.getComponent('chords');


		var sectionNumber = this.songModel.getSectionNumberFromBarNumber(barNumber);
		var section = this.songModel.getSection(sectionNumber);
		var sectionNumberOfBars = section.getNumberOfBars();
		if (sectionNumberOfBars === 1 && this.songModel.getSections().length === 1) {
			UserLog.logAutoFade('warn', "Can't delete the last bar of the last section.");
			return;
		}


		// remove notes in bar
		var beatDuration = this.songModel.getTimeSignatureAt(barNumber).getQuarterBeats() - 0.001; // I am not sure why we remove 0.001 here
		var numBeat = this.songModel.getStartBeatFromBarNumber(barNumber);
		var index = nm.getNextIndexNoteByBeat(numBeat);
		var index2 = nm.getPrevIndexNoteByBeat(numBeat + beatDuration);
		nm.notesSplice([index, index2], []);
		nm.reviseNotes();

		// remove chords in bar
		cm.removeChordsByBarNumber(barNumber);
		// if we are removing bar with time signature change, and following bar has no time signature change,
		// we move it to following bar
		//
		// adjust all chords bar number
		cm.incrementChordsBarNumberFromBarNumber(-1, barNumber);
		var timeSigChange = bm.getBar(barNumber).getTimeSignatureChange();
		if (timeSigChange && barNumber < bm.getTotal() - 1 && !bm.getBar(barNumber + 1).getTimeSignatureChange()) { //if it's not the last bar
			bm.getBar(barNumber + 1).setTimeSignatureChange(timeSigChange);
		}

		//we remove the bar
		bm.removeBar(barNumber);

		// adjust section number of bars (important to do it after removing bar, because 'number of bars in section' is used when deleting bar)
		section.setNumberOfBars(sectionNumberOfBars - 1);

		// We remove the section in songModel if it was the last bar of the section
		if (sectionNumberOfBars === 1) {
			this.songModel.removeSection(sectionNumber);
		}
		this.cursor.setPos(index - 1);
	};

	StructureEditionController.prototype.setTimeSignature = function(timeSignature) {
		/**
		 * modifies selBars end index, if there is a time signature change, selection is reduced until the bar before the time change,
		 * this behaviour is copied from Sibelius
		 * @return {Boolean} tells if we actually reduced selection or not, later we set Time Signature change to the previous only if we did not reduce. 
		 */
		function reduceSelectionIfChanges() {
			//if there are timeSig changes in selection we just take until change
			var barsIt = new SongBarsIterator(song);
			var timeSigChangesInSelection = false,
				iBar,
				prevTimeSignature;
			barsIt.setBarIndex(selBars[0] + 1); //we check if there is a timeSig change in the middle (not in first bar) 
			while (barsIt.getBarIndex() <= selBars[1]) {
				iBar = barsIt.getBarIndex();

				if (barsIt.doesTimeSignatureChange()) {
					timeSigChangesInSelection = true;
					selBars[1] = barsIt.getBarIndex() - 1;
					break;
				}
				barsIt.next();
			}
			return timeSigChangesInSelection;
		}
		/**
		 * @param  {Array} selBars       indexes of bars selected
		 * @param  {Array} selectedNotes notes selected
		 * @param  {Integer} numSelectedBars notes selected
		 * @param  {TimeSignaureModel} newTimeSig    new time signature
		 * @return {Array}               notes adapted to new time signature
		 */
		function calcAdaptedNotes(selBars, selectedNotes, numSelectedBars, newTimeSig) {
			var tmpNm = new NoteManager();
			tmpNm.setNotes(selectedNotes);
			var notes = tmpNm.getNotesAdaptedToTimeSig(newTimeSig, numSelectedBars);
			tmpNm.setNotes(notes);
			var numBars = tmpNm.getTotalDuration() / newTimeSig.getQuarterBeats();
			return {
				notes: notes,
				numBars: numBars
			};
		}

		//actually starts here
		var selBars = [];
		selBars[0] = this.songModel.getComponent('notes').getNoteBarNumber(this.cursor.getStart(), this.songModel);
		selBars[1] = this.songModel.getComponent('notes').getNoteBarNumber(this.cursor.getEnd(), this.songModel);
		if (selBars.length === 0) {
			return;
		}

		var song = this.songModel,
			barMng = song.getComponent("bars"),
			noteMng = song.getComponent("notes"),
			newTimeSig = new TimeSignatureModel(timeSignature);

		//we check if there are time signature changes within the selection in that case selection is reduced until first change, selBars[1] is modified 
		var timeSigChangesInSelection = reduceSelectionIfChanges();

		//we get start and en beats of selection
		var startBeat = song.getStartBeatFromBarNumber(selBars[0]);
		
		if (selBars[0] === 0 && selBars[1] === selBars[0]){
			selBars[1] = barMng.getTotal() - 1;
		}
		var endBeat = (barMng.getTotal() - 1 === selBars[1]) ? null : song.getStartBeatFromBarNumber(selBars[1] + 1);

		//we get selected notes and adapt them to new time signature
		var indexes = noteMng.getIndexesStartingBetweenBeatInterval(startBeat, endBeat);
		var selectedNotes = noteMng.cloneElems(indexes[0], indexes[1]);
		var numSelectedBars = selBars[1] + 1 - selBars[0];
		var calc;
		try {
			calc = calcAdaptedNotes(selBars, selectedNotes, numSelectedBars, newTimeSig);
			var adaptedNotes = calc.notes;
			var numBarsAdaptedNotes = calc.numBars;

			//HERE we change time signature
			var prevTimeSignature = song.getTimeSignatureAt(selBars[0]);
			if (selBars[0] === 0) { // in case it's first measure we change the whole song time signature
				song.setTimeSignature(timeSignature);
			} else {
				barMng.getBar(selBars[0]).setTimeSignatureChange(timeSignature);
			}

			//check if we have to create bars to fit melody (normally if new time sign. has less beats than old one)
			var diffBars = numBarsAdaptedNotes - numSelectedBars;
			if (diffBars) {
				barMng.insertBar(selBars[1], song, diffBars);
			}


			//we set previous time signature in the bar just after the selection, only if there are no time sign. changes and if we are not at end/begining of the song
			var indexFollowingBar = selBars[1] + diffBars + 1;
			if ((selBars[0] !== 0 || selBars[1] !== 0) && // if we are not in the first bar
				barMng.getTotal() > indexFollowingBar && // if following bar exists
				!timeSigChangesInSelection &&
				!barMng.getBar(indexFollowingBar).getTimeSignatureChange()) //if there is no time signature change in following bar
			{
				barMng.getBar(indexFollowingBar).setTimeSignatureChange(prevTimeSignature.toString());
			}

			//we set end index to -1 because notesSplice indexes are inclusive (so if we want to paste notes over indexes [0,5] we don't have to send 0,6 like in cloneElems). These differences among the code are confusing. TODO: refactor 
			indexes[1]--;
			//we overwrite adapted notes in general note manager
			noteMng.notesSplice(indexes, adaptedNotes);
		} catch (e) {
			console.log(e);
			UserLog.logAutoFade('error', "Tuplets can't be broken");
			return;
		}

		$.publish('ToHistory-add', 'Time signature set to ' + timeSignature);
	};
	StructureEditionController.prototype.tonality = function(tonality) {
		var selBars = this._getSelectedBars();

		var barMng = this.songModel.getComponent("bars");

		var isFirstBar = selBars.length === 1 && selBars[0] === 0;
		var lastIndex = selBars.length - 1; //will be 0 or 1

		var selectedUntilEnd = selBars[lastIndex] === barMng.getTotal() - 1;

		var prevKeySignature;
		if (!isFirstBar && !selectedUntilEnd) {
			var barsIt = new SongBarsIterator(this.songModel);
			barsIt.setBarIndex(selBars[lastIndex]);
			prevKeySignature = barsIt.getBarKeySignature();
		}
		//if cursor is in first bar, we change whole song's tonality
		if (isFirstBar) {
			this.songModel.setTonality(tonality);
		}else {
			barMng.getBar(selBars[0]).setKeySignatureChange(tonality);	
		}
		
		if (prevKeySignature){
			barMng.getBar(selBars[lastIndex] + 1).setKeySignatureChange(prevKeySignature);
		}
		$.publish('ToHistory-add', 'Tonality set to ' + tonality);
	};

	StructureEditionController.prototype.ending = function(ending) {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = 0, c = selBars.length; i < c; i++) {
			if (ending === "none") {
				ending = undefined;
			}
			this.songModel.getComponent("bars").getBar(selBars[i]).setEnding(ending);
		}
		$.publish('ToHistory-add', 'Ending set to ' + ending);
	};

	StructureEditionController.prototype.style = function(style) {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = 0, c = selBars.length; i < c; i++) {
			if (style === "none") {
				style = undefined;
			}
			this.songModel.getComponent("bars").getBar(selBars[i]).setStyle(style);
		}
		$.publish('ToHistory-add', 'Style set to ' + style);
	};

	StructureEditionController.prototype.label = function(label) {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = 0, c = selBars.length; i < c; i++) {
			if (label === "none") {
				label = '';
			}
			this.songModel.getComponent("bars").getBar(selBars[i]).setLabel(label);
		}
		$.publish('ToHistory-add', 'Label set to ' + label);
	};

	StructureEditionController.prototype.subLabel = function(sublabel) {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = 0, c = selBars.length; i < c; i++) {
			if (sublabel === "none") {
				sublabel = undefined;
			}
			this.songModel.getComponent("bars").getBar(selBars[i]).setSublabel(sublabel);
		}
		$.publish('ToHistory-add', 'Sublabel set to ' + sublabel);
	};
	/**
	 * @return {Array} of first and last indexes (both inclusive) of selected bars, if only one bar is selected return only one position
	 */
	StructureEditionController.prototype._getSelectedBars = function() {
		var noteMng = this.songModel.getComponent('notes');
		var selectedBars = [];
		selectedBars[0] = noteMng.getNoteBarNumber(this.cursor.getStart(), this.songModel);
		selectedBars[1] = noteMng.getNoteBarNumber(this.cursor.getEnd(), this.songModel);
		if (selectedBars[1] === selectedBars[0]) {
			selectedBars.pop();
		}
		return selectedBars;
	};
	

	StructureEditionController.prototype.unfold = function(force) {
		var unfold = true;
		if (!force) {
			unfold = !this.structEditionModel.unfolded;
		}
		if (unfold) {
			this.foldedComponents = UnfoldingManager.getComponents(this.songModel);
			this.songModel.unfold();
		}
		else{
			UnfoldingManager.restoreComponents(this.songModel, this.foldedComponents);
		}

		$.publish('ToViewer-draw', [this.songModel, true]);
		
		this.structEditionModel.toggleUnfolded();
		$.publish('ToLayers-removeLayer');
	};

	StructureEditionController.prototype.transposeSong = function(semiTons) {
		if (isNaN(semiTons) || semiTons === 0) {
			return;
		}
		function getTransposedNote(note, interval, direction){
			var newNote = new Note(note.getPitchClass(), note.getAccidental(), note.getOctave());
			newNote.transposeBy(interval,direction);
			return newNote.toString();
		}

		var transpositions = [
			'unison',		//0
			'minorSecond',	//1
			'majorSecond',	//2
			'minorThird',	//3
			'majorThird',	//4
			'perfectFourth',//5
			'augmentedFourth',//6
			'perfectFifth', //7
			'minorSixth',	//8
			'majorSixth',	//9
			'minorSeventh',	//10
			'majorSeventh',	//11
			'octave',		//12
			'minorNinth',	//13
			'majorNinth'	//14
		];

		var interval = Intervals[transpositions[Math.abs(semiTons)]];
		var direction = semiTons < 0 ? -1 : 1;

		// notes
		// First we get all notes and all midi notes
		//var nm = this.songModel.getComponent('notes');
		var noteMng = this.songModel.getComponent('notes');
		var start = 0,
			end = noteMng.getTotal(),
			pitchClass, note;
		// var start = this.cursor.getStart();
		//  	end = this.cursor.getEnd() + 1;
		var tmpNoteMng = noteMng.score2play(this.songModel, start, end);

		for (var i = 0; i < tmpNoteMng.getTotal(); i++) {
			note = tmpNoteMng.getNote(i);
			if (!note.isRest){
				note.setNoteFromString(getTransposedNote(note, interval, direction));
			}
		}

		noteMng.notesSplice([start, end -1], tmpNoteMng.getNotes());
		
		//if everything is selected we transpose key signature
		var firstBar = this.songModel.getComponent('bars').getBar(0);
		var firstBarKeySig = firstBar.getKeySignatureChange();
		var keySignature =  firstBarKeySig || this.songModel.getTonality();

		var pitch = new PitchClass(keySignature);
		var newKeySig = pitch.transposeBy(interval,direction).toString();
		if (firstBarKeySig) {
			firstBar.setKeySignatureChange(); //remove key signature change in first bar
		}
		this.songModel.setTonality(newKeySig);

		tmpNoteMng = noteMng.play2score(this.songModel, start, end);
		noteMng.notesSplice([start, end - 1], tmpNoteMng.getNotes());
		// chords
		var chordMng = this.songModel.getComponent('chords');
		var chord;
		for (i = 0, c = chordMng.getTotal(); i < c; i++) {
			chord = chordMng.getChord(i);
			if (chord.getNote()=="NC")	continue;
			
			pitchClass = new PitchClass(chord.getNote());
			chord.setNote(pitchClass.transposeBy(interval, direction).toString());
		}

		$.publish('ToHistory-add', 'Transpose Song ' + semiTons + ' half ton(s)');
	};

	return StructureEditionController;
});