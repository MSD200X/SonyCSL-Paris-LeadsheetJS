define([
	'modules/core/src/ChordModel',
	'modules/ChordEdition/src/ChordSpaceView',
	'modules/Cursor/src/CursorModel',
	'modules/converters/MusicCSLJson/src/ChordModel_CSLJson',
	'utils/UserLog',
	'modules/Edition/src/ElementManager',
	'jquery',
	'pubsub'
], function(ChordModel, ChordSpaceView, CursorModel, ChordModel_CSLJson, UserLog, ElementManager, $, pubsub) {
	/**
	 * ChordSpaceManager creates and manages an array of chord space which is represented as a rectangle on each beat on top of bars
	 * @param {SongModel}  songModel         
	 * @param {CursorModel}  cursor            
	 * @param {LSViewer}  viewer            
	 * @param {Boolean} isEnabled         boolean that tells if it is initially enabled
	 * @param {ChordSpaceEdition}  chordSpaceEdition object enables edition of chords
	 * @param {String}  mode              values: 
	 *                                    	ALL_CHORD_SPACES creates a chord space on each beat of the song (some chord space will be empty, others will have a chord)
	 *                                    	ONLY_CHORDS 	 creates chord spaces only in beats in which there are chords
	 * @exports ChordEdition/ChordSpaceManager
	 */
	function ChordSpaceManager(songModel, cursor, viewer, isEnabled, chordSpaceEdition, mode) {
		if (!songModel || !cursor) {
			throw "ChordSpaceManager missing params";
		}
		this.CL_NAME = 'ChordsCursor';
		this.CL_TYPE = 'CURSOR';
		this.songModel = songModel;
		this.cursor = cursor;
		this.chordSpaces = [];
		this.elemMng = new ElementManager();
		this.initSubscribe();
		this.enabled = !!isEnabled;
		this.viewer = viewer;
		this.mode = mode || 'ALL_CHORD_SPACES';
		if (this.mode === 'ALL_CHORD_SPACES'){
			this.MARGIN_TOP = 5;
			this.MARGIN_RIGHT = 5;
		}else{
			this.MARGIN_TOP = 3;
			this.MARGIN_RIGHT = -2;
		}
		if (chordSpaceEdition) {
			this.chordSpaceEdition = chordSpaceEdition;
			this.chordSpaceEdition.setMargins(this.MARGIN_RIGHT, this.MARGIN_TOP);
		}
	}

	/**
	 * Subscribe to view events
	 */
	ChordSpaceManager.prototype.initSubscribe = function() {
		var self = this;
		$.subscribe('LSViewer-drawEnd', function(el, viewer) {
			if (typeof viewer.canvasLayer === "undefined") {
				return;
			}
			viewer.canvasLayer.addElement(self);

			self.chordSpaces = self.chordSpaceEdition || self.mode ===  'ALL_CHORD_SPACES' ? self.createAllChordSpaces(viewer) : self.createFilledChordSpaces(viewer);
			if (self.chordSpaces.length === 0){
				throw "chordSpace could not be created, probably ChordSpaceManager is on mode ONLY_CHORDS, and LSViewer.SAVE_CHORDS is false";
			}
			self.cursor.setListElements(self.chordSpaces.length);
			viewer.canvasLayer.refresh();
		});

		$.subscribe('ChordSpaceView-updateChord', function(el, chordJson, chordModel, chordSpace) {
			self.updateChord(chordJson, chordModel, chordSpace);
			$.publish('ToViewer-draw', self.songModel);
			self.chordSpaceEdition.undrawEditableChord();
		});
		// cursor view subscribe
		$.subscribe('Cursor-moveCursorByElement-chords', function(el, inc) {
			self.moveCursorByBar(inc);
		});
		$.subscribe('esc', function() {
			self.chordSpaceEdition.undrawEditableChord();
		});
		$.subscribe('ctrl-a', function() {
			self.enable();
			self.cursor.selectAll();
			self.viewer.canvasLayer.refresh();
		});
	};
	ChordSpaceManager.prototype.getType = function() {
		return this.CL_TYPE;
	};
	/**
	 * Function return several areas to indicate which notes are selected, usefull for cursor or selection
	 * @param  {Array} Array with initial position and end position as integer
	 * @return {Array}, return array of object in this form: {area.x, area.y, area.xe, area.ye}
	 */
	ChordSpaceManager.prototype.createAllChordSpaces = function(viewer) {
		var chordSpace = [];
		if (typeof viewer.vxfBars === "undefined") {
			return;
		}
		var xi, yi, xe, ye,
			beatsInBar,
			decalX,
			widthBeat,
			area,
			offset; //to be aligned with section name (whose offset is determined by vexflow)

		for (var i = 0, c = viewer.vxfBars.length; i < c; i++) {
			beatsInBar = viewer.vxfBars[i].timeSignature.getBeats();
			offset = viewer.vxfBars[i].offset || 0;
			widthBeat = (viewer.vxfBars[i].barDimensions.width - offset) / beatsInBar;
			for (var j = 0; j < beatsInBar; j++) {
				area = {
					x: (viewer.vxfBars[i].barDimensions.left + widthBeat * j) + offset,
					y: viewer.vxfBars[i].barDimensions.top - (viewer.vxfBars[i].symbolsPositions.CHORDS_DISTANCE_STAVE),
					w: widthBeat,
					h: this.mode === 'ALL_CHORD_SPACES' ? 20 : 40
				};
				chordSpace.push(new ChordSpaceView(viewer, area, i, j + 1, viewer.scaler));
			}
		}
		return chordSpace;
	};

	ChordSpaceManager.prototype.createFilledChordSpaces = function(viewer) {
		var chordSpace = [];
		for (var i = 0; i < viewer.chordViews.length; i++) {
			chordSpace.push(new ChordSpaceView(viewer, viewer.chordViews[i], i, i, viewer.scaler));
		}
		return chordSpace;
	};
	/**
	 * @interface
	 *
	 * @param  {Object} coords [description]
	 */
	ChordSpaceManager.prototype.getYs = function(coords) {
		return this.elemMng.getYs(this.chordSpaces, coords);
	};

	/**
	 * @interface
	 * @param  {Object} coords  
	 * @param  {Integer} ini     
	 * @param  {Integer} end     
	 * @param  {Boolean} clicked 
	 * @param  {Boolean} mouseUp, (never used but needed to keep parameter order)
	 * @param  {Boolean} ctrlPressed 
	 */
	ChordSpaceManager.prototype.onSelected = function(coords, ini, end, clicked, mouseUp, ctrlPressed) {
		var posCursor = this.elemMng.getElemsInPath(this.chordSpaces, coords, ini, end, this.getYs(coords));

		if (ctrlPressed) {
			posCursor = this.elemMng.getMergedCursors(posCursor, this.cursor.getPos());
		}

		if (posCursor[0] !== null) {
			this.cursor.setPos(posCursor);
		}
		// if event was clicked and we just selected one chord, we draw the pull down
		if (posCursor[0] == posCursor[1] && clicked && this.cursor.getEditable()) {
			var position = this.cursor.getPos();
			position = position[0];
			if (this.chordSpaceEdition) {
				this.chordSpaceEdition.drawEditableChord(this.chordSpaces[position], this.cursor);
			}
		}
	};

	/**
	 * @interface
	 *
	 * @param  {CanvasContext} ctx
	 */
	ChordSpaceManager.prototype.drawCursor = function(ctx) {
		var self = this;

		function drawChordSpaceBorders(ctx) {
			for (var j = 0; j < self.chordSpaces.length; j++) {
				var position = self.chordSpaces[j].getArea();

				ctx.strokeStyle = "#999999";
				ctx.strokeRect(
					position.x,
					position.y - self.MARGIN_TOP,
					position.w - self.MARGIN_RIGHT,
					position.h + self.MARGIN_TOP
				);
			}
		}
		var pos = this.cursor.getPos();
		if (pos[0] !== false) {
			for (var i = pos[0]; i <= pos[1]; i++) {
				if (this.chordSpaces[i] && this.chordSpaces[i].draw) {
					this.chordSpaces[i].draw(ctx, self.MARGIN_TOP, self.MARGIN_RIGHT);
				}
			}
		}
		if (this.chordSpaceEdition) {
			drawChordSpaceBorders(ctx);
		}
	};
	/**
	 * @interface
	 *
	 * @return {Boolean}
	 */
	ChordSpaceManager.prototype.isEnabled = function() {
		return this.enabled;
	};

	/**
	 * @interface
	 */
	ChordSpaceManager.prototype.enable = function() {
		this.enabled = true;
	};

	/**
	 * @interface
	 */
	ChordSpaceManager.prototype.disable = function() {
		if (this.chordSpaceEdition) {
			this.chordSpaceEdition.undrawEditableChord();
		}
		this.enabled = false;
	};

	/**
	 * @interface
	 * @param  {Object} coords {x: xval, y: yval}}
	 * @return {Boolean}
	 */
	ChordSpaceManager.prototype.inPath = function(coords) {
		return !!this.getChordsInPath(coords);
	};
	/**
	 * @interface
	 */
	ChordSpaceManager.prototype.setCursorEditable = function(bool) {
		this.cursor.setEditable(bool);
	};

	ChordSpaceManager.prototype.updateChord = function(chordJson, chordModel, chordSpace) {
		var chordMng = this.songModel.getComponent('chords');
		chordJson.beat = chordSpace.beatNumber;
		chordJson.barNumber = chordSpace.barNumber;

		if (chordModel === undefined) { //adding new chord
			var chordModel = ChordModel_CSLJson.importFromMusicCSLJSON(chordJson);
			chordMng.addChord(chordModel);
		} else if (chordJson.empty) {
			chordMng.removeChord(chordModel);
		} else {
			var i = chordMng.getChordIndex(chordModel);
			chordModel = ChordModel_CSLJson.importFromMusicCSLJSON(chordJson);
			chordMng.setChord(chordModel, i);
		}
		$.publish('ToHistory-add', 'Update Chords ' + chordModel.toString());

	};

	ChordSpaceManager.prototype.getChordsInPath = function(coords) {
		return this.elemMng.getElemsInPath(this.chordSpaces, coords);
	};

	ChordSpaceManager.prototype.moveCursorByBar = function(inc) {
		var barNum = this.chordSpaces[this.cursor.getPos()[0]].barNumber;
		var startBeat = this.songModel.getStartBeatFromBarNumber(barNum + inc) - 1;

		if (barNum === 0 && inc === -1) {
			this.cursor.setPos(0);
		} else {
			this.cursor.setPos(startBeat);
			this.chordSpaceEdition.drawEditableChord(this.chordSpaces[startBeat], this.cursor);
		}
	};


	return ChordSpaceManager;
});