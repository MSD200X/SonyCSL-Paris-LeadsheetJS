define(['modules/Audio/src/BarTimesManager',
	'modules/core/src/SongBarsIterator',
	'modules/Audio/src/WaveBarView',
	'jquery'
], function(BarTimesManager, SongBarsIterator, WaveBarView, $) {

	function AudioDrawer(songModel, viewer, audioCursor, audioAnimation, params) {
		params = params || {};

		this.songModel = songModel;
		this.viewer = viewer;
		this.tempo; // value filled onload
		this.barTimesMng = new BarTimesManager();
		this.audio = null;
		this.color = ["#55F", "#99F"];
		//params
		this.showHalfWave = !!params.showHalfWave;
		this.topAudio = params.topAudio || 80;
		this.heightAudio = params.heightAudio || 100;
		this.pixelRatio = params.pixelRatio || window.devicePixelRatio;
		this.drawMargins = !!params.drawMargins; //for debugging
		this.marginCursor = params.marginCursor || 0;
		this.audioCursor = audioCursor;
		if (this.useAudioCursor)
		{
			this.audioAnimation = audioAnimation;
		}
		this._initSubscribe();
	};

	AudioDrawer.prototype._initSubscribe = function() {
		var self = this;
		$.subscribe('Audio-Loaded', function(el, audio, tempo) {
			self.audio = audio;
			self.tempo = tempo;
			self.isEnabled = true;
			self.barTimesMng.setBarTimes(self.songModel, self.audio);
			self.viewer.setShortenLastBar(true);
			self.adaptViewer();
			self.viewer.forceNewCanvasLayer = true;
			self.viewer.draw(self.songModel); // we need to redraw because we change some things on the viewer
			// audio draw is done after viewer draw (event LSViewer-drawEnd)

		});
		$.subscribe('LSViewer-drawEnd', function() {
			if (self.audio && self.audio.isEnabled && self.isEnabled) {
				self.draw(self.barTimesMng, self.tempo, self.audio.getDuration());
			}
		});
		$.subscribe('ToLayers-removeLayer', function(){
			self.disable();
		});
		$.subscribe('AudioDrawer-enable', function(){
			self.enable();
		});
	};

	AudioDrawer.prototype._drawPeaks = function(peaks, area, color, viewer) {
		var ctx = viewer.ctx;
		var self = this;

		

		viewer.drawElem(function() {
			// A half-pixel offset makes lines crisp
			var $ = 0.5 / self.pixelRatio;
			var width = area.w;
			var height = area.h;
			var offsetY = area.y;
			var halfH = height / 2;
			var length = peaks.length;
			var scale;
			var i, h, maxH;

			// if (self.params.fillParent && width != length) {
			//     scale = width / length;
			// }
			maxH = self.showHalfWave ? halfH : height;
			scale = width / length;
			ctx.fillStyle = color;
			if (self.drawMargins) {
				self._drawMargins(area, ctx);
			}

			ctx.beginPath();
			ctx.moveTo(area.x + $, halfH + offsetY);
			// 3 lines for printing the inferior half
			if (!self.showHalfWave) {
				for (i = 0; i < length; i++) {
					h = Math.round(peaks[i] * halfH);
					ctx.lineTo(area.x + i * scale + $, halfH + h + offsetY);
				}
			}

			ctx.lineTo(area.x + width + $, halfH + offsetY);
			ctx.moveTo(area.x + $, halfH + offsetY);

			for (i = 0; i < length; i++) {
				h = Math.round(peaks[i] * maxH);
				ctx.lineTo(area.x + i * scale + $, halfH - h + offsetY);
			}

			ctx.lineTo(area.x + width + $, halfH + offsetY);
			ctx.closePath();
			ctx.fill();
			// Always draw a median line
			ctx.fillRect(area.x, halfH + offsetY - $, width, $);
		});

	};

	AudioDrawer.prototype._drawMargins = function(area, ctx) {
		ctx.beginPath();
		ctx.moveTo(area.x, area.y);
		ctx.lineTo(area.x + area.w, area.y);
		ctx.stroke();

		ctx.moveTo(area.x, area.y + area.h);
		ctx.lineTo(area.x + area.w, area.y + area.h);
		ctx.stroke();
		ctx.closePath();
	};

	/**
	 * LSViewer's params are modified so that audio fits (bigger margin between lines)
	 */
	AudioDrawer.prototype.adaptViewer = function() {
		if (this.topAudio > 0) { // if audio is greater than 0 it means audio will be on top of score line
			this.viewer.setLineMarginTop(this.topAudio);
		} else {
			distance = (this.heightAudio - this.topAudio) - this.viewer.lineHeight;
			if (distance > 0) {
				this.viewer.setLineMarginTop(distance, true);

			}
		}
	};

	AudioDrawer.prototype.disable = function() {
		if (!this.isEnabled) return;

		this.isEnabled = false;
		this.audioCursor.disable();
		this.viewer.setShortenLastBar(false);
		this.viewer.resetLinesHeight();
		this.viewer.forceNewCanvasLayer = true; // force new canvas when redrawing
		this.viewer.draw(this.songModel); 
	};	

	AudioDrawer.prototype.enable = function() {
		this.isEnabled = true;
		this.audioCursor.enable();
		this.viewer.setShortenLastBar(true);
		this.adaptViewer();
		this.viewer.forceNewCanvasLayer = true; // force new canvas when redrawing
		this.viewer.draw(this.songModel); 
	};

	AudioDrawer.prototype.draw = function(barTimesMng, tempo, duration) {
		if (!tempo || !duration) {
			throw "AudioDrawer - missing parameters, tempo : " + tempo + ", duration:" + duration;
		}
		/**
		 * @param  {Array} peaksPerBar array of arrays of peaks representing peaks for each bar
		 * @return {Array}             same array normalized
		 */
		function normalize(peaksPerBar) {
			var NORM_FACTOR = 0.8; //if 1, maximum will draw until the very top of the audio space
			var max = 0;
			for (var i = 0; i < peaksPerBar.length; i++) {
				for (var j = 0; j < peaksPerBar[i].length; j++) {
					if (peaksPerBar[i][j] > max) max = peaksPerBar[i][j];
				}
			}
			if (max !== 0) {
				for (var i = 0; i < peaksPerBar.length; i++) {
					for (var j = 0; j < peaksPerBar[i].length; j++) {
						peaksPerBar[i][j] /= max / NORM_FACTOR;
					}
				}
			}
			return peaksPerBar;
		}
		
		this.waveBarDimensions = [];
		var numBars = barTimesMng.getLength();
		var area, dim, prevDim, bar, barTime = 0,
			sliceSong,
			start = 0,
			peaks,
			toggleColor = 0,
			peaksPerBar = [];
		// we get peaks for each measure
		for (var i = 0; i < barTimesMng.getLength(); i++) {
			sliceSong = barTimesMng.getCurrBarTime(i) / duration;
			prevDim = dim;
			dim = this.viewer.barWidthMng.getDimensions(i);

			if (!dim) {
				dim = prevDim;
				dim.left = dim.left + dim.width;
				dim.width = dim.width / this.viewer.LAST_BAR_WIDTH_RATIO - dim.width;
			}
			waveBarView = new WaveBarView({
				x: dim.left,
				y: dim.top - this.viewer.CHORDS_DISTANCE_STAVE - this.topAudio,
				w: dim.width,
				h: this.heightAudio
			}, this.viewer.scaler);

			this.waveBarDimensions.push(waveBarView);
			area = waveBarView.getArea();
			peaks = this.audio.getPeaks(area.w, start, start + sliceSong);
			peaksPerBar.push(peaks);
			start += sliceSong;
		}
		//normalize
		peaksPerBar = normalize(peaksPerBar);
		// and drraw them
		for (var i = 0; i < this.waveBarDimensions.length; i++) {
			peaks = peaksPerBar[i];
			area = this.waveBarDimensions[i].getArea();
			this._drawPeaks(peaks, area, this.color[toggleColor], this.viewer);
			toggleColor = (toggleColor + 1) % 2;
		}
		$.publish('AudioDrawer-audioDrawn', this);
	};
	return AudioDrawer;
});