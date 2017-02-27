define([
	'modules/core/src/NoteManager',
	'modules/Unfold/src/PointLabel',
	'modules/Unfold/src/StartLabel',
	'modules/Unfold/src/EndLabel',
	'modules/Unfold/src/CodaToLabel',
	'modules/Unfold/src/ToCodaLabel',
	'modules/Unfold/src/StartPoint',
	'modules/Unfold/src/EndPoint',
	'modules/Unfold/src/ToCodaPoint',
	'modules/Unfold/src/SectionEndPoint',
	'modules/Unfold/src/SectionStartPoint',
	'modules/Unfold/src/SectionRepetition',
	'modules/Unfold/src/DaAlRepetition',
	'modules/Unfold/src/SectionRepetitionFactory',
	'modules/Unfold/src/LeadsheetUnfoldConfig',
	'modules/Unfold/src/RepetitionsHolder',
	'modules/Unfold/src/SectionSegment',
	'modules/Unfold/src/NotesMapper'
], function(NoteManager, PointLabel, StartLabel, EndLabel, CodaToLabel, ToCodaLabel, StartPoint, EndPoint, ToCodaPoint, SectionEndPoint, SectionStartPoint, SectionRepetition,
	DaAlRepetition, SectionRepetitionFactory, LeadsheetUnfoldConfig, RepetitionsHolder, SectionSegment, NotesMapper) {

	var LeadsheetStructure = function(song) {
		var self = this;
		var startLabels = {};
		var endLabels = {};
		var sectionStartPoints = {};
		var sectionEndPoints = {};
		var repetitions = [];

		var lastSectionEndPoint = null;

		this.leadsheet = song;
		this.sections = song.getSections();

		song.setStructure(this);
		// IIFE init function at the end

		function hasStartLabel(label) {
			return startLabels.hasOwnProperty(label);
		}
		this.hasEndLabel = function(label) {
			return endLabels.hasOwnProperty(label);
		};
		/**

		 * @param  {Object} label         {label: 'SEGNO', type:'start'};
		 * @param  {Integer} sectionNumber
		 * @param  {Integer} barNumber
		 */
		var createLabel = function(label, sectionNumber, barNumber) {
			if (label.type === 'start') {
				return createStartLabel(label.label, sectionNumber, barNumber);
			} else if (label.type === 'end') {
				return createEndLabel(label.label, sectionNumber, barNumber);
			} else {
				return null;
			}
		};

		var createStartLabel = function(label, sectionNumber, barNumber) {
			if (hasStartLabel(label)) {
				return;
			}
			var playIndex = self.sections[sectionNumber].getPlayIndexOfBar(barNumber);
			var startPoint = Object.create(StartPoint);
			startPoint.initValues(self, label, sectionNumber, barNumber, playIndex);
		};

		var createEndLabel = function(label, sectionNumber, barNumber) {
			if (self.hasEndLabel(label)) {
				return;
			}
			var playIndex = self.sections[sectionNumber].getPlayIndexOfBar(barNumber);
			var endPoint;
			if (EndLabel.TOCODAS.indexOf(label) !== -1) {
				endPoint = Object.create(ToCodaPoint);
				endPoint.callInitValues(self, label, sectionNumber, barNumber, playIndex);
			} else {
				endPoint = Object.create(EndPoint);
				endPoint.initValues(self, label, sectionNumber, barNumber, playIndex);
			}
		};

		var addDaAlRepetition = function(sublabel, sectionNumber, barNumber) {
			var playIndex = self.sections[sectionNumber].getPlayIndexOfBar(barNumber);
			var daAlRepetition = Object.create(DaAlRepetition);
			daAlRepetition.initValues(self, sublabel, sectionNumber, barNumber, playIndex);
			addRepetition(daAlRepetition);
		};
		this.getRepetitions = function() {
			return repetitions;
		};
		this.getSection = function(i) {
			return this.sections[i];
		};

		this.addStartLabel = function(point) {
			startLabels[point.getLabel()] = point;
		};

		this.addEndLabel = function(point) {
			endLabels[point.getLabel()] = point;
		};

		this.getStartLabels = function() {
			return startLabels;
		};

		this.getEndLabels = function() {
			return endLabels;
		};

		this.getStartLabel = function(label) {
			if (!startLabels.hasOwnProperty(label)) {
				console.warn("missing label " + label);
			}
			return startLabels[label];
		};

		this.getEndLabel = function(label) {
			if (!endLabels.hasOwnProperty(label)) {
				console.warn("missing label " + label);
			}
			return endLabels[label];
		};

		this.getSectionStartPoints = function() {
			return sectionStartPoints;
		};
		this.getSectionEndPoints = function() {
			return sectionEndPoints;
		};
		//we make it public for testing purposes (PTP)
		this.getLastSectionEndPoint = function() {
			return lastSectionEndPoint;
		};
		this.getSectionStartPoint = function(iSection) {
			return sectionStartPoints[iSection];
		};
		this.getSectionEndPoint = function(iSection, playIndex) {
			return sectionEndPoints[iSection + "-" + playIndex];
		};
		this.getSectionLastEndPoint = function(iSection) {
			var playIndex = this.sections[iSection].getLastPlayIndex();
			return this.getSectionEndPoint(iSection, playIndex);
		};

		var addSectionPlayPoints = function(section, iSection, playIndex) {
			var sectionEndPoint = Object.create(SectionEndPoint);
			sectionEndPoint.callInitValues(self, iSection, playIndex);
			sectionEndPoints[iSection + "-" + playIndex] = sectionEndPoint;
			lastSectionEndPoint = sectionEndPoint;
		};
		var hasRepetitionUntil = function(point) {
			for (var i = 0; i < repetitions.length; i++) {
				if (repetitions[i].getUntilPoint() === point)
					return true;
			}
			return false;
		};
		var addCoda = function(label, sectionNumber, barNumber) {
			if (self.hasEndLabel(label)) {
				// Second coda sign
				// Returns false if both coda signs are already found
				// EndPoint toCodaPoint = getEndLabel(label);
				return addCodaTo(ToCodaLabel.getCodaToLabel(label), sectionNumber, barNumber);
			} else {
				createEndLabel(label, sectionNumber, barNumber);
			}
		};

		var addCodaTo = function(toLabel, sectionNumber, barNumber) {
			var toCodaPoint;
			var toCodaLabel = CodaToLabel.getToCodaLabel(toLabel);
			if (self.hasEndLabel(toCodaLabel)) {
				toCodaPoint = endLabels[toCodaLabel];
			} else if (toCodaLabel === EndLabel.TOCODA2) {

				if (!self.hasEndLabel(EndLabel.TOCODA)) {
					return false;
				}
				//NO ENTIENDO
				toCoda1Point = EndLabel.get(EndLabel.TOCODA);
				toCodaPoint = createEndLabel(toCodaLabel, toCoda1Point.section, toCoda1Point.bar);
			}
			if (!toCodaPoint) {
				return false;
			}
			createStartLabel(toLabel, sectionNumber, barNumber);
			if (!hasRepetitionUntil(toCodaPoint)) {
				addDaAlRepetition("DC al Coda", sectionNumber, barNumber);
			}
		};

		var addRepetition = function(repetition) {
			repetitions.push(repetition);
		};

		var initSection = function(iSection, numBar) {
			var section = self.sections[iSection];
			section.setBarsInfo(numBar, self.leadsheet.getComponent('bars'));
			var sectionStartPoint = Object.create(SectionStartPoint);
			sectionStartPoint.callInitValues(self, iSection);
			sectionStartPoints[iSection] = sectionStartPoint;

			var numPlays = section.hasOpenRepeats() ? 1 : section.getNumTimesToPlay();

			for (var playIndex = 0; playIndex < numPlays; playIndex++) {
				addSectionPlayPoints(section, iSection, playIndex);
			}
			if (section.hasOpenRepeats()) {
				addRepetition(SectionRepetitionFactory.get(self, iSection, 0));
			} else {
				for (playIndex = 0; playIndex < numPlays - 1; playIndex++) {
					addRepetition(SectionRepetitionFactory.get(self, iSection, playIndex));
				}
			}
		};

		this.getUnfoldConfig = function() {
			return new LeadsheetUnfoldConfig(this);
		};
		this.addSegmentsToList = function(list, cursor, toPoint) {
			var fromPoint = cursor.point;
			if (!fromPoint || !toPoint || toPoint.isBefore(fromPoint)) {
				throw "invalid segment ";
			}
			for (var iSection = fromPoint.section; iSection <= toPoint.section; iSection++) {
				var sectionIsFromPoint = iSection === fromPoint.section;
				var sectionIsToPoint = iSection === toPoint.section;

				var segmentFrom =  sectionIsFromPoint ? fromPoint : this.getSectionStartPoint(iSection);
				var segmentTo =  sectionIsToPoint ? toPoint : this.getSectionLastEndPoint(iSection);
				var playIndex = sectionIsFromPoint && sectionIsToPoint ? cursor.playIndex : segmentTo.playIndex;
				list.push(new SectionSegment(this.leadsheet, segmentFrom, segmentTo, playIndex));
			}
			return list;
		};
		this.getSegments = function() {
			this.getUnfoldConfig();
			var segments = [];

			if (this.sections.length === 0) {
				return segments;
			}
			var repHolder = Object.create(RepetitionsHolder);
			repHolder.init(this);
			var cursor = {
				point: self.getStartLabel(StartLabel.CAPO),
				playIndex: 0
			};
			var targetsStack = [];

			targetsStack.push({
				point: self.getEndLabel(EndLabel.END)
					//, repetition: null
			});
			var nextTarget, nextRepetition;
			while (targetsStack.length !== 0) {
				nextTarget = targetsStack[targetsStack.length - 1];
				nextRepetition = repHolder.getNextRepetitionIfBefore(cursor, nextTarget);
				if (nextRepetition) {
					targetsStack.push({
						point: nextRepetition.getTargetPoint(),
						repetition: nextRepetition
					});
					continue;
				}
				nextTarget = targetsStack.pop();
				if (nextTarget.repetition !== null && nextTarget.repetition !== undefined) {

					nextRepetition = nextTarget.repetition;
					this.addSegmentsToList(segments, cursor, nextRepetition.getFromPoint());

					cursor = nextRepetition.updateCursor(cursor);
					var repUntilPoint = nextRepetition.getUntilPoint();
					nextTarget = targetsStack[targetsStack.length - 1];

					if (nextTarget && repUntilPoint && repUntilPoint.isBefore(nextTarget.point)) {
						targetsStack.push({
							point: nextRepetition.getUntilPoint()
						});
					}
				} else {
					this.addSegmentsToList(segments, cursor, nextTarget.point);
					cursor = nextTarget.point.updateCursor();
					if (!cursor.point)
						break;
				}
			}
			return segments;
		};
		/**
		 * Once we obtained the segments we generate the unfolded lead sheet
		 */
		this.setUnfoldedLeadsheet = function(segments) {
			var newUnfoldedSection, prevUnfoldedSection, segment;
			var unfoldedBarIdx = 0;
			var foldedBarIdx;
			var notesMapper = new NotesMapper();
			var sections = [];
			var bars = [];
			var chords = [];
			var tmpNoteMng = new NoteManager();
			var lastKeySig = this.leadsheet.getTonality();
			for (var i = 0; i < segments.length; i++) {
				segment = segments[i];
				foldedBarIdx = segment.getSectionStartBarNumber(sections);

				segment.addUnfoldedSection(sections);
				//to keep key signature consistent in the unfolded song
				lastKeySig = segment.addUnfoldedSectionBars(bars, foldedBarIdx, lastKeySig);

				segment.addUnfoldedSectionChords(chords, foldedBarIdx, unfoldedBarIdx);
				segment.addUnfoldedSectionNotes(tmpNoteMng, foldedBarIdx, notesMapper);

				unfoldedBarIdx += sections[i].getNumberOfBars();
			}
			this.leadsheet.sections = sections;
			this.leadsheet.getComponent('bars').setBars(bars);
			this.leadsheet.getComponent('chords').setAllChords(chords);
			var noteMng = this.leadsheet.getComponent('notes');
			noteMng.setNotes(tmpNoteMng.getNotes());

			//this allows to keep correct durations on lonely whole rests bars, whose duration dependes on time signature
			if (noteMng.containsWholeRests()) {
				this.leadsheet.updateNotesBarDuration();
			}
			this.leadsheet.notesMapper = notesMapper;
		};
		function lookForCodas(section,iSection) {
			if (section.isNamedCoda()) {
				addCodaTo(StartLabel.CODATO, iSection, 0);
			} else if (section.isNamedCoda2()) {
				addCodaTo(StartLabel.CODA2TO, iSection, 0);
			} else {
				var coda;
				var codaLabels = PointLabel.getToCodaLabels();
				for (i = 0; i < codaLabels.length; i++) {
					coda = codaLabels[i];
					if (section.hasLabel(coda)) {
						addCoda(coda, iSection, section.getLabel(coda));
					}
				}
			}
		}
		function lookForSegnos(section,iSection) {
			var soloLabels = PointLabel.getSoloLabels();
			var labelName;
			for (i = 0; i < soloLabels.length; i++) {
				labelName = soloLabels[i].label;
				if (section.hasLabel(labelName)) {
					createLabel(soloLabels[i], iSection, section.getLabel(labelName)); //last para is number of bar
				}
			}
		}
		function lookForSublabels(section, iSection) {
			var sublabels = section.getSublabels();
			for (var keySublabel in sublabels) {
				if (sublabels.hasOwnProperty(keySublabel)){
					addDaAlRepetition(keySublabel, iSection, sublabels[keySublabel]);
				}
			}
		}
		//Init function IIFE
		(function() {

			if (self.sections.length === 0) {
				return;
			}
			createStartLabel(StartLabel.CAPO, 0, 0);
			var section, i, numBar = 0;
			for (var iSection = 0; iSection < self.sections.length; iSection++) {
				try {
					section = self.sections[iSection];
					initSection(iSection, numBar);
					numBar += section.getNumberOfBars();

					lookForCodas(section, iSection);
					lookForSegnos(section, iSection);
					lookForSublabels(section, iSection);
				} catch(e) {
					console.log('Error on Leadsheet structure Initialization.');
					console.log(e);
				}

			}
			createEndLabel(EndLabel.END, lastSectionEndPoint.section, lastSectionEndPoint.bar);
		}());
	};
	return LeadsheetStructure;
});
