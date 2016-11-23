define([
	'jquery',
	'underscore',
	'modules/Edition/src/ElementManager',
	'modules/Cursor/src/CursorModel'
], function($, _, ElementManager, CursorModel) {
	/**
	 *	AudioCursor may not be drawn but will still be used to map note cursor pos with audio times
	 */
	function AudioCursor(audioController, audioPlayer, viewer, audioAnimation) {
		this.CL_TYPE = 'CURSOR';
		this.CL_NAME = 'audioCursor';
		this.audioController = audioController;
		this.viewer = viewer;
		this.elemMng = new ElementManager();
		this.audioAnimation = audioAnimation;
		this._initSubscribe();
	}

	AudioCursor.prototype._initSubscribe = function() {
		var self = this;
		$.subscribe('AudioDrawer-audioDrawn', function() {
			self.cursor = new CursorModel(self.audioDrawer.audio.getDuration());
			//if there is no canvasLayer we don't paint cursor
			if (self.viewer.canvasLayer) {
				self.viewer.canvasLayer.addElement(self);
				if (self.audioAnimation){
					self.audioAnimation.addCursor(self);
				}				
				self.updateCursorPlaying(0);
				self.viewer.canvasLayer.refresh();
			}

		});
		$.subscribe("NoteSpace-CursorPosChanged", function(el, cursorStart, cursorEnd) {
			// first convert to unfolded indexes
			cursorStart = self.audioController.song.notesMapper.getFirstUnfoldedIdx(cursorStart);
			cursorEnd = self.audioController.song.notesMapper.getFirstUnfoldedIdx(cursorEnd);
			var beats = self.audioController.song.getComponent('notes').getBeatIntervalByIndexes(cursorStart, cursorEnd);
			var startTime = self.audioController.beatDuration * (beats[0] - 1);
			var endTime = self.audioController.beatDuration * (_.last(beats) - 1);
			if (cursorStart === cursorEnd) {
				$.publish('AudioCursor-clickedAudio', startTime);
			} else {
				$.publish('AudioCursor-selectedAudio', [startTime, endTime]);
			}
			//if audio is not being drawn, no need to move audio cursor
			if (!self.audioDrawer || !self.audioDrawer.isEnabled) return;
			if (self.cursor) {
				self.cursor.setPos([startTime, endTime]); //we equal cursor start and end cursor, because this way the player won't loop
				self.updateCursorPlaying(startTime);
			}
		});

	};

	AudioCursor.prototype.setAudioDrawer = function(audioDrawer) {
		this.audioDrawer = audioDrawer;
	}

	/**
	 * 
	 * @param  {Object} coords  
	 * @param  {Integer} ini  initial cursor position
	 * @param  {Integer} end  end cursor position
	 * @param  {Boolean} clicked is not used (it is just to respect the parameter order, as this function is called on other objects)
	 * @param  {Boolean} mouseUp
	 */
	AudioCursor.prototype.onSelected = function(coords, ini, end, clicked, mouseUp) {
		var self = this;
		var cursorBars = this.elemMng.getElemsInPath(this.audioDrawer.waveBarDimensions, coords, ini, end, this.getYs(coords));
		var ys = this.getYs(coords);

		end = end || ini;

		if (cursorBars[0] != null && cursorBars[1] != null) {
			var x1, x2;
			if ((this.elemMng.fromLeftBottom2TopRight(ini, end) || this.elemMng.fromTopRight2BottomLeft(ini, end)) && this.elemMng.includesMultipleLines(ys)) {
				x1 = coords.xe;
				x2 = coords.x;
			} else {
				x1 = coords.x;
				x2 = coords.xe;
			}
			var pos1 = this._getAudioTimeFromPos(x1, cursorBars[0]);
			var pos2 = this._getAudioTimeFromPos(x2, cursorBars[1]);
			this.cursor.setPos([pos1, pos2]);
			this.updateCursorPlaying(pos1, cursorBars[0]);
		}
		if (mouseUp) {
			var posCursor = this.cursor.getPos();
			if (posCursor[0] != posCursor[1]) { //if there is something selected
				$.publish('AudioCursor-selectedAudio', posCursor);
			}else{
				$.publish('AudioCursor-clickedAudio', posCursor);
			}
		}
	};
	AudioCursor.prototype.getType = function() {
		return this.CL_TYPE;
	};
	/**
	 * @interface
	 */
	AudioCursor.prototype.getYs = function(coords) {
		return this.elemMng.getYs(this.audioDrawer.waveBarDimensions, coords);
	};

	// WaveDrawer is a CanvasLayer element, so here, enabled means that user is interacting with it (selecting parts of the wave audio)
	/**
	 * @interface
	 */
	AudioCursor.prototype.isEnabled = function() {
		return this.enabled;
	};

	/**
	 * @interface  			
	 */
	AudioCursor.prototype.enable = function() {
		this.enabled = true;
	};

	/**
	 * @interface
	 */
	AudioCursor.prototype.disable = function() {
		this.enabled = false;
	};

	/**
	 * @interface
	 * @param  {Object} ctx Object that usually contain mouse position
	 * @return {Boolean}     Boolean indicates if coords position is on wave or not
	 */
	AudioCursor.prototype.inPath = function(coords) {
		return !!this.elemMng.getElemsInPath(this.audioDrawer.waveBarDimensions, coords);
	};

	AudioCursor.prototype.drawPlayingCursor = function(ctx) {
		ctx.beginPath();
		ctx.moveTo(this.cursorPos.x, this.cursorPos.y);
		ctx.lineTo(this.cursorPos.x, this.cursorPos.y + this.cursorPos.h);
		ctx.stroke();
	};
	/**
	 * @interface
	 * @param  {CanvasContext} ctx
	 */
	AudioCursor.prototype.drawCursor = function(ctx) {
		var saveFillColor = ctx.fillStyle;
		ctx.fillStyle = "#9900FF";
		ctx.globalAlpha = 0.2;
		var areas = this.getAreasFromTimeInterval(this.cursor.getStart(), this.cursor.getEnd());
		for (i = 0, c = areas.length; i < c; i++) {
			ctx.fillRect(
				areas[i].x,
				areas[i].y,
				areas[i].w,
				areas[i].h
			);
		}
		ctx.fillStyle = saveFillColor;
		ctx.globalAlpha = 1;
	};

	AudioCursor.prototype.setCursorEditable = function(bool) {
		if (this.cursor) {
			this.cursor.setEditable(bool);
		}
	};

	AudioCursor.prototype.updateCursorPlaying = function(time, barIndex) {
		this.cursorPos = this._getAudioPosFromTime(time, barIndex);
	};

	/**
	 * @param  {Float} time      in seconds (e.g. 4.54)
	 * @param  {Integer} barIndex number of bar in which the cursor is (should be previously calculated)
	 * @return {Object}          e.g. { x: 12, y: 23, w:5, h:5}
	 */
	AudioCursor.prototype._getAudioPosFromTime = function(time, barIndex) {
		barIndex = barIndex || this.audioDrawer.barTimesMng.getBarIndexByTime(time);
		var timeBoundaries = this.audioDrawer.barTimesMng.getTimeLimits(barIndex);
		var timeDist = timeBoundaries.end - timeBoundaries.start;
		var dim = this.audioDrawer.waveBarDimensions[barIndex].getArea();
		var percent = (time - timeBoundaries.start) / (timeBoundaries.end - timeBoundaries.start);
		var newDim = {};
		newDim.y = dim.y + this.audioDrawer.marginCursor;
		newDim.h = dim.h - this.audioDrawer.marginCursor * 2;
		newDim.x = dim.x + percent * dim.w;
		newDim.w = dim.w;
		return newDim;
	};
	/**
	 * @param  {Integer} x        coordinate x
	 * @param  {Integer} barIndex number of bar in which the cursor is (should be previously calculated)
	 * @return {Float}  time in seconds (e.g. 3.94)
	 */
	AudioCursor.prototype._getAudioTimeFromPos = function(x, barIndex) {
		var timeBoundaries = this.audioDrawer.barTimesMng.getTimeLimits(barIndex);
		var timeDist = timeBoundaries.end - timeBoundaries.start;

		var barDim = this.viewer.scaler.getScaledObj(this.audioDrawer.waveBarDimensions[barIndex].getArea());
		var percentPos = (x - barDim.x) / barDim.w;

		return percentPos * timeDist + timeBoundaries.start;
	};

	AudioCursor.prototype.getAreasFromTimeInterval = function(startTime, endTime) {
		var barTimesMng = this.audioDrawer.barTimesMng;
		var startBar = barTimesMng.getBarIndexByTime(startTime);
		var endBar = barTimesMng.getBarIndexByTime(endTime);
		var areas = this.elemMng.getElementsAreaFromCursor(this.audioDrawer.waveBarDimensions, [startBar, endBar]);
		var cursor1 = this._getAudioPosFromTime(startTime, startBar);
		var cursor2 = this._getAudioPosFromTime(endTime, endBar);
		if (cursor1.x != cursor2.x) {
			if (cursor1.x > areas[0].x && cursor1.x < areas[0].x + areas[0].w) {
				var space = cursor1.x - areas[0].x;
				areas[0].x = cursor1.x;
				areas[0].w -= space;
			}
			var lastArea = areas[areas.length - 1];

			if (cursor2.x > lastArea.x && cursor2.x < lastArea.x + lastArea.w) {
				lastArea.w = cursor2.x - lastArea.x;
			}
		} else {
			areas = [];
		}
		return areas;
	};
	/**
	 * Interface function for AudioAnimation
	 * @param  {AudioController} audio 
	 */
	AudioCursor.prototype.update = function(audio) {
		var currTime = audio.getCurrentTime();
		var barIndex = this.audioDrawer.barTimesMng.getBarIndexByTime(currTime); 
		if (barIndex < this.audioDrawer.barTimesMng.getLength()) {
			this.updateCursorPlaying(currTime, barIndex);
		}

	};
	return AudioCursor;
});