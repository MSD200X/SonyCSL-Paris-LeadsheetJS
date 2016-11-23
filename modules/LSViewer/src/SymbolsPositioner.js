define(
	[
		'modules/core/src/SongBarsIterator',
		'modules/core/src/SectionBarsIterator',
		'underscore'
	], 
	function(SongBarsIterator, SectionBarsIterator, _) {
		/**
		 * Class used to determine positions of chords, symbols, endings, sections for a line
		 * 
		 * @param {SongModel}
		 * @param {BarWidthManager}
		 */
		function SymbolsPositioner(song, barWidthManager, defaultPositioningValues, voicesToDraw) {
			this.barWidthManager = barWidthManager;
			this.song = song;
			this.voicesToDraw = voicesToDraw ? voicesToDraw : [];
			this.defaultPositioningValues = defaultPositioningValues ? defaultPositioningValues : {};
			_.defaults(this.defaultPositioningValues, {PADDING_LEFT_CHORDS: 0, CHORDS_DISTANCE_STAVE: 10, LABELS_Y: 0, ENDINGS_Y: 12});
			this.linesPositions = [];
		}

		/**
		 * return bar indexes where sections indications will be rendered
		 * @return {Array} Array of bar indexes
		 */
		var _setBarIndexesWithParts = function() {
			this.barIndexesWithSections = [];
			var currentBarIndex = 0;
			var barManager = this.song.getComponent('bars');
			var songBarsIt = new SongBarsIterator(this.song);
			_.forEach(this.song.getSections(), function(section){
				var bar = barManager.getBar(currentBarIndex);
				songBarsIt.setBarIndex(currentBarIndex);
				// when we have in a measure a second coda sign and the section is called Coda, remove section name since it will be written inside the left Coda sign
				if (section.getName().toLowerCase() === 'coda' && bar.getLabel() === 'coda' && songBarsIt.hasLabelInPrecedingBars('coda')) {
					section.displayName = false;
				}
				if (section.getName() && section.displayName) {
					this.barIndexesWithSections.push(currentBarIndex);
				}
				currentBarIndex += section.numberOfBars;
			}, this);
		};

		var _findLineForBarIndex = function(lines, barIndexRequested) {
			var lineStartsAt = 0;
			var lineIndexFound = 0;
			lines.every(function(line, lineIndex) {
				if (barIndexRequested >= lineStartsAt && barIndexRequested < (line.length + lineStartsAt)) {
					lineIndexFound = lineIndex;
					return false;
				} else {
					lineStartsAt += line.length;
					return true;
				}
			});
			return lineIndexFound;
		};

		SymbolsPositioner.prototype.setElementsPositonsByLine = function() {
		 	var barManager = this.song.getComponent('bars');
			var barIndex = 0;
			_setBarIndexesWithParts.apply(this);
			_.forEach(this.barWidthManager.barsStruct, function(line, lineIndex) {
				var lineProps = {hasLabel: false, hasSectionSigns: false, hasEndings: false, hasChords: false, };
				_.forEach(line, function(){
					var bar = barManager.getBar(barIndex);
					if (lineProps.hasLabel === false && !_.isUndefined(bar.getLabel()) && bar.getLabel().length !== 0) { 
						lineProps.hasLabel = true;
					}
					if (lineProps.hasEndings === false && !_.isUndefined(bar.getEnding())) {
						lineProps.hasEndings = true;
					}
					if (lineProps.hasSectionSigns === false && this.barIndexesWithSections.indexOf(barIndex) !== -1) {
						lineProps.hasSectionSigns = true;
					}
					barIndex++;
				}, this);
				var linePositions = _.clone(this.defaultPositioningValues);
				var chordsDistanceToAdd = 0;
				var labelsYToAdd = 0;
				if (this.voicesToDraw.length > 1) {
					if (lineProps.hasSectionSigns) {
						chordsDistanceToAdd = 5;
					}
					if (lineProps.hasEndings || lineProps.hasLabel) {
						chordsDistanceToAdd += 12;
					}
				}
				linePositions.CHORDS_DISTANCE_STAVE += chordsDistanceToAdd;
				linePositions.LABELS_Y += labelsYToAdd;
				this.linesPositions.push(linePositions);
			}, this);
		};

		SymbolsPositioner.prototype.getPositionsForBarIndex = function(barIndex) {
			var lineIndexFound = _findLineForBarIndex(this.barWidthManager.barsStruct, barIndex);
			var positionsFound = this.linesPositions[lineIndexFound] ? this.linesPositions[lineIndexFound] : this.defaultPositioningValues;
			// special case: if bar has section indication and symbols, we need to offset chords on the right
			var bar = this.song.getComponent('bars').getBar(barIndex);
			if (this.barIndexesWithSections.indexOf(barIndex) !== -1 && bar.getLabel()) {
				positionsFound = _.clone(positionsFound);
				positionsFound.PADDING_LEFT_CHORDS = 20;
				positionsFound.LABELS_BAR_START_Y = -12;
			}
			return positionsFound;
		};

		return SymbolsPositioner;
	}
);