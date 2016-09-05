define([
	'jquery',
	'modules/core/src/NoteManager',
	'modules/core/src/BarManager',
	'modules/core/src/ChordManager',
	'modules/core/src/TimeSignatureModel',
	'modules/core/src/SongBarsIterator',
	'modules/Unfold/src/LeadsheetStructure'
], function($, NoteManager, BarManager, ChordManager, TimeSignatureModel, SongBarsIterator, LeadsheetStructure) {
	/**
	 * SongModel is the main model to represent song, it contains notes, chords and bars components, also contain section, composer name etc.
	 * @exports core/SongModel
	 */
	function SongModel(param) {
		this.init(param);
	}

	SongModel.prototype.init = function(params) {
		params = params || {};
		this.title = params.title || '';
		this.composers = params.composers || [];
		this.style = params.style || '';
		this.source = params.source || '';
		this.tempo = params.tempo || 120;
		this.tonality = params.tonality || "C";
		this.timeSignature = params.timeSignature || new TimeSignatureModel('4/4');
		this.sections = params.sections || [];
		this.components = params.components || [];

		this.addComponent('notes', new NoteManager());
		this.addComponent('bars', new BarManager());
		this.addComponent('chords', new ChordManager());
	};

	///////////////////////////////
	// Basic getters and setters //
	///////////////////////////////

	SongModel.prototype.getTitle = function() {
		return this.title;
	};
	SongModel.prototype.setTitle = function(title) {
		title = title || 'Untitled';
		this.title = title;
	};

	SongModel.prototype.getComposer = function(i) {
		i = i || 0;
		return this.composers[i];
	};
	SongModel.prototype.setComposer = function(composer) {
		composer = composer || 'No Composer';
		this.composers[0] = composer;
	};
	SongModel.prototype.addComposer = function(composer) {
		if (typeof composer !== "undefined") {
			this.composers.push(composer);
			return true;
		}
		return false;
	};
	
	SongModel.prototype.getStyle = function() {
		return this.style;
	};

	SongModel.prototype.setStyle = function(style) {
		if (typeof style === "undefined") {
			return;
		}
		this.style = style;
	};

	SongModel.prototype.getSource = function() {
		return this.source;
	};

	SongModel.prototype.setSource = function(source) {
		if (typeof source !== "undefined") {
			this.source = source;
			return true;
		}
		return false;
	};

	SongModel.prototype.setTempo = function(tempo) {
		if (typeof tempo === "undefined" || isNaN(tempo) || tempo < 0) {
			return;
		}
		this.tempo = tempo;
	};

	SongModel.prototype.getTempo = function() {
		return this.tempo;
	};

	SongModel.prototype.setTonality = function(tonality) {
		if (typeof tonality === "undefined") {
			return;
		}
		this.tonality = tonality;
	};

	SongModel.prototype.getTonality = function() {
		return this.tonality;
	};
	/**
	 * Get the tonality of a bar by looping for each previous bar or by default on song tonality 
	 * (not called for the moment)
	 * @param  {int} barNumber
	 * @return {string} eg. C, Bb etc
	 */
	SongModel.prototype.getKeySignatureAt = function(barNumber) {
		var barsIt = new SongBarsIterator(this);
		barsIt.setBarIndex(barNumber);
		return barsIt.getBarKeySignature();
	};

	SongModel.prototype.setTimeSignature = function(timeSignature) {
		if (typeof timeSignature === "undefined") {
			this.timeSignature = new TimeSignatureModel('4/4');
		} else {
			this.timeSignature = new TimeSignatureModel(timeSignature);
		}
	};

	SongModel.prototype.getTimeSignature = function() {
		return this.timeSignature;
	};
	/*
	 * GetTimeSignatureAt returns the time signature at one precise moment defined by the barNumber. 
	 * It should not be used inside a loop iterating bars, SongBarsIterator should be used instead in that case
	 * @param  {int} barNumber
	 * @return {timeSignatureModel} currentTimeSignature like 3/4
	 */
	SongModel.prototype.getTimeSignatureAt = function(barNumber) {
		var barsIt = new SongBarsIterator(this);
		barsIt.setBarIndex(barNumber);
		return barsIt.getBarTimeSignature();
	};
	/**
	 * @param  {Integer} index  index of the section
	 * @return {SectionModel}
	 */
	SongModel.prototype.getSection = function(index) {
		if (isNaN(index) || index < 0 || index > this.sections.length) {
			throw "SongModel - getSection - invalid index :" + index;
		}
		return this.sections[index];
	};
	SongModel.prototype.getSections = function() {
		return this.sections;
	};
	/**
	 * addSection can be used on constructing a song (e.g. importing from MusicCSLJson) 
	 * @param {SectionModel} sectionsItem 
	 * @param {Integer} index   
	 */
	SongModel.prototype.addSection = function(sectionsItem, index) {
		if (index === undefined) {
			this.sections.push(sectionsItem);
		} else {
			this.sections.splice(index, 0, sectionsItem);
		}
	};
	SongModel.prototype.removeSection = function(sectionIndex) {
		if (typeof sectionIndex === "undefined" || isNaN(sectionIndex) || sectionIndex < 0) {
			throw "SongModel - removeSection - invalid sectionIndex " + sectionIndex;
		}
		this.sections.splice(sectionIndex, 1);
	};
	/**
	 * gets component (either chords or notes)
	 * @param  {String} componentTitle must be "chords" or "notes" or "bars"
	 * @return {NoteManager | ChordManager}
	 */
	SongModel.prototype.getComponent = function(componentTitle) {
		if (this.components.hasOwnProperty(componentTitle))
			return this.components[componentTitle];
		else
			return undefined;
	};

	SongModel.prototype.addComponent = function(componentTitle, componentItem) {
		if (!componentItem) return false;
		this.components[componentTitle] = componentItem;
		return true;
	};
	/**
	 * Function has to be called inside an iteration, it checks if there is a timesignature change in current bar
	 * if not, it returns the currentBeats (calculated previously and sent as parameter)
	 * @param  {Number} index
	 * @param  {Number}
	 * @return {Number}
	 */
	SongModel.prototype.getBarNumBeats = function(numBar, currentBeats) {
		var barTimeSig = this.getComponent("bars").getBar(numBar).getTimeSignatureChange();

		if (numBar === 0 && !barTimeSig) {
			barTimeSig = this.getTimeSignature();
		}
		if (!barTimeSig && !currentBeats) {
			throw "bad use: either song is not well formatted, either currentBeats is not sent";
		}

		return (barTimeSig) ? barTimeSig.getQuarterBeats() : currentBeats;
	};
	/**
	 * returns the start bar number of any section, first bar is 0
	 * @param  {int} sectionNumber
	 * @return {int} start Bar Number of section
	 */
	SongModel.prototype.getStartBarNumberFromSectionNumber = function(sectionNumber) {
		if (isNaN(sectionNumber)) {
			throw "SongModel - getStartBarNumberFromSectionNumber - sectionNumber is not a number: " + sectionNumber;
		}
		var barNumber = 0;
		for (var i = 0; i < sectionNumber; i++) {
			barNumber += this.getSection(i).getNumberOfBars();
		}
		return barNumber;
	};
	/**
	 * Returns the section number in which the bar is
	 * @param  {int} barNumber
	 * @return {int} section number (index) start at 0
	 */
	SongModel.prototype.getSectionNumberFromBarNumber = function(barNumber) {
		if (barNumber === undefined || isNaN(barNumber) || barNumber < 0) {
			throw "SongModel - getSectionNumberFromBarNumber - barNumber is not a number: " + barNumber;
		}
		var sections = this.getSections();
		var sumBar = 0;
		for (var i = 0; i < sections.length; i++) {
			sumBar += sections[i].getNumberOfBars();
			if (sumBar > barNumber) {
				return i;
			}
		}
		return undefined;
	};
	/**
	 * Function return the number of beat before a bar number in a folded song
	 * @param  {int} barNumber is the number of bar you want to have the first beat
	 * @return {int} number of beat to reach realBarNumber
	 */
	SongModel.prototype.getStartBeatFromBarNumber = function(barNumber) {
		var numberOfBeats = 1;
		if (typeof barNumber !== "undefined" && !isNaN(barNumber) && barNumber >= 0) {
			for (var i = 0; i < barNumber; i++) {
				numberOfBeats += this.getTimeSignatureAt(i).getQuarterBeats();
			}
		}
		return numberOfBeats;
	};

	/**
	 * Get number of bars of the whole song
	 * @return {int} length of the song in bars
	 */
	SongModel.prototype.getNumberOfBars = function() {
		var barNumber = 0;
		for (var i = 0, c = this.sections.length; i < c; i++) {
			barNumber += this.sections[i].getNumberOfBars();
		}
		return barNumber;
	};
	/**
	 * Compute song length in beats
	 * @return {int} length of the song in beats
	 */
	SongModel.prototype.getSongTotalBeats = function() {
		var numberOfBeats = 0;
		var bm = this.getComponent('bars');
		var currentNumberBeatsByBar = this.getTimeSignature().getQuarterBeats();
		var barNumber = 0;
		for (var i = 0, c = this.sections.length; i < c; i++) {
			for (var j = 0, v = this.sections[i].getNumberOfBars(); j < v; j++) {
				if (typeof bm.getBar(barNumber) !== "undefined" && typeof bm.getBar(barNumber).getTimeSignatureChange() !== "undefined") {
					currentNumberBeatsByBar = bm.getBar(barNumber).getTimeSignatureChange().getQuarterBeats();
				}
				numberOfBeats += currentNumberBeatsByBar;
				barNumber++;
			}
		}
		return numberOfBeats;
	};
	/**
	 * Returns all components in a given bar number, componentTitle attriubtes is a filter for component title (eg chords, notes...)
	 * @param  {int} barNumber
	 * @param  {string} componentTitle will filter all the result depending the type (chords, notes...)
	 * @return {array} it returns an array of the direct object
	 */
	SongModel.prototype.getComponentsAtBarNumber = function(barNumber, componentTitle) {
		var components = [];

		if (!componentTitle || !this.components.hasOwnProperty(componentTitle)) {
			throw 'the item is matching not known type in getComponentsAtBarNumber';
		}

		var modelManager = this.components[componentTitle];
		if (typeof ChordManager !== "undefined" && modelManager instanceof ChordManager) {
			var chords = modelManager.getChordsByBarNumber(barNumber);
			for (var i = 0; i < chords.length; i++) {
				components.push(chords[i]);
			}
		} else if (typeof NoteManager !== "undefined" && modelManager instanceof NoteManager) {
			var notes = components.concat(modelManager.getNotesAtBarNumber(barNumber, this));
			for (var j = 0; j < notes.length; j++) {
				components.push(notes[j]);
			}
		}
		return components;
	};
	/**
	 * gets divisions between beats depending on bars. Useful when filling gaps with silences in noteManager within several bars
	 * @param  {Integer} startBeat 
	 * @param  {Integer} endBeat   
	 * @return {Array}           returns duration of each division (check usage in testSongModel)
	 */
	SongModel.prototype.getBarDivisionsBetweenBeats = function(startBeat, endBeat) {
		var lastTotalBeat = this.getSongTotalBeats() + 1;
		if (startBeat < 1) startBeat = 1;
		if (endBeat > lastTotalBeat) endBeat = lastTotalBeat;
		var divisions = [];
		var residualBeat = startBeat - Math.floor(startBeat);
		var duration = endBeat - startBeat;
		if (residualBeat !== 0) {
			var firstSilenceDur = 1 - residualBeat;
			if (duration >= firstSilenceDur) {
				divisions.push(firstSilenceDur);
				startBeat += firstSilenceDur;
			}
		}

		var songIt = new SongBarsIterator(this);
		var currentBeat = startBeat,
			nextBarBeat = 1,
			currentBarBeat, //bar boundaries (in iteration)
			endDivisionBeat, startDivisionBeat; //division boundaries

		while (songIt.hasNext()) {
			// we set bar boundaries
			currentBarBeat = nextBarBeat;
			nextBarBeat = currentBarBeat + songIt.getBarTimeSignature().getQuarterBeats();

			//we check current bar is within start and end beats sent to the function as params
			if (nextBarBeat > currentBeat && currentBarBeat < endBeat) {
				endDivisionBeat = (endBeat < nextBarBeat) ? endBeat : nextBarBeat;
				startDivisionBeat = (currentBeat > currentBarBeat) ? currentBeat : currentBarBeat;
				divisions.push(endDivisionBeat - startDivisionBeat);
			}
			songIt.next();
		}
		return divisions;
	};
	/**
	 * Alias for init function, it can be more adapted to some situations
	 */
	SongModel.prototype.clear = function() {
		this.init();
	};
	/**
	 * Clones SongModel object and its components, but not the content of components (arrays of bars, chords and notes)
	 * Clone is for the moment used together with the unfold function, which clones the content components while unfolding
	 * @return {SongModel}
	 */
	SongModel.prototype.clone = function() {
		var songModelCloned = $.extend(true, new SongModel(), this);
		var barMng = new BarManager();
		var chordMng = new ChordManager();
		var noteMng = new NoteManager();
		
		barMng.setBars(this.getComponent('bars').getBars());
		chordMng.setAllChords(this.getComponent('chords').getChords());
		noteMng.setNotes(this.getComponent('notes').getNotes());

		songModelCloned.components.bars = barMng;
		songModelCloned.components.notes = noteMng;
		songModelCloned.components.chords = chordMng;

		return songModelCloned;
	};
	SongModel.prototype.setStructure = function(leadsheetStructure) {
		this.structure = leadsheetStructure;
	};
	SongModel.prototype.getStructure = function() {
		return this.structure;
	};
	/**
	 * If there are bars with only one whole rest (very few cases), we set their real duration, which depends on the time signature bar
	 */
	SongModel.prototype.updateNotesBarDuration = function() {
		/**
			function already defined in noteManager, it should be used in an 'utils' mod
		*/
		function roundBeat (beat) {
			return Math.round(beat * 1000000) / 1000000;
		}
		var songIt = new SongBarsIterator(this),
			notes = this.getComponent('notes').getNotes(),
			currentBarNumBeats = songIt.getBarTimeSignature().getQuarterBeats(),
			notesBarDur = 0;
		
		var i = 0;
		while (songIt.hasNext() && i < notes.length){
		
			// if it's first note, and duration depends on bar (only whole notes can have durationDependsOnBar = true)
			if (notesBarDur === 0 && notes[i].durationDependsOnBar){
				notes[i].barDuration = currentBarNumBeats;
			}

			notesBarDur += notes[i].getDuration();
			if (roundBeat(notesBarDur) > currentBarNumBeats){
				console.warn("note exceeds bar duration (index "+ i +") bar "+songIt.getBarIndex());
			}
			else if (roundBeat(notesBarDur) === currentBarNumBeats ){
				notesBarDur = 0;
				songIt.next();	
				if (songIt.hasNext()){
					currentBarNumBeats = songIt.getBarTimeSignature().getQuarterBeats();	
				}
			}
			i++;
		}
	};

	SongModel.prototype.unfold = function() {
		var struct = new LeadsheetStructure(this);
		var segments = struct.getSegments();
		struct.setUnfoldedLeadsheet(segments);
	};

	return SongModel;
});