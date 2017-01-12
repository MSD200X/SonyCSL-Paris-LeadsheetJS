define(
	['jquery', 'underscore', 'modules/Audio/src/AudioContext', 'modules/Audio/src/BufferLoader'], 
	function($, _, AudioContext, BufferLoader) {
		/**
		 * Low level audio treating 
		 * @param {Number} timeEndSong given in seconds 
		 */
		function AudioController(song) {
			var _setSong = function(songModel) {
				this.song = songModel ? songModel.clone() : this.song;
				if (songModel) {
					this.song.unfold();
				}
			};
			this.song = false;
			_setSong(song);
			this.audioCtx = new AudioContext();
			this.sources = [];
			this.isEnabled = false; //accessed publicly
			this.sources = [];
			this.reloadSources = false;
			this.startedAt;
			this.startMargin;
			this.pausedAt = 0;
			this.tempo;
			this.file;
			this.isPlaying = false;
			this.pos = 0;
			this.presetLoop; //will be an object
			this.songNumBeats;
			this.beatDuration;
			this.timeEndSong;
			// default tempo 120
			this._setParams(120);
			var self = this;
			$.subscribe('ToViewer-draw', function(el, songModel) {
				_setSong.apply(self, [songModel]);
			});
		}

		var _updateLoopOnSources = function() {
			for (var i in this.sources) {
				if (this.presetLoop) {
					this.sources[i].loop = true;
					this.sources[i].loopStart = this.presetLoop.from;
					this.sources[i].loopEnd = this.presetLoop.to;
				} else {
					this.sources[i].loop = false;
				}
			}
		};

		AudioController.prototype._setParams = function(tempo) {
			this.songNumBeats =  this.song ? this.song.getSongTotalBeats() : 0;
			this.beatDuration = 60 / tempo;
			this.timeEndSong = this.beatDuration * this.songNumBeats; //song duration until last beat (without residual audi
		};

		/**
		 * @param  {String} url source of audi file
		 */
		AudioController.prototype.load = function(urls, tempo, startMargin, loop, callback, tracksProps) {
			urls = _.isArray(urls) ? urls : [urls];
			if (!tempo){
				throw "AudioController load missing tempo";
			}
			var self = this;
			self.tracksProps = tracksProps;
			self.bufferLoader = new BufferLoader(
				this.audioCtx,
				urls, 
				function() {
					self._setParams(tempo);
					self.startMargin = startMargin || 0;
					self.isEnabled = true;
					if (loop){
						self.loop(); //initializing loop on whole song
					}
					$.publish('PlayerModel-onload', 'audio');
					$.publish('Audio-Loaded', [self, tempo] );
					if (_.isFunction(callback)) {
						callback();
					}
					this.reloadSources = false;
					self.createSourcesFromBuffers.apply(self);
				}
			);
			$.publish('Audio-disabled');
			self.bufferLoader.load();
		};

		AudioController.prototype.createSourcesFromBuffers = function(){
			var newSources = [];
			_.forEach(this.bufferLoader.bufferList, function(buffer, index) {
				if (buffer) {
					var newSource = this.audioCtx.createBufferSource();
					newSources.push(newSource);
		            newSource.buffer = buffer;
		            if (this.tracksProps && this.tracksProps[index]) {
		            	newSource.name = this.tracksProps[index].name;
		            	// newSource.name = this.tracksProps[index].name;
		            	var oldSource = _.find(this.sources, {name: newSource.name});
		            	if (this.reloadSources === false && this.tracksProps && this.tracksProps[index]) {
		            		newSource.gain = this.tracksProps[index].gain;
		            	} else if (oldSource && oldSource.gain !== undefined) {
		            		newSource.gain = oldSource.gain;
		            	}
		            }
		            newSource.connect(this.audioCtx.destination);
				}
			}, this);
			this.sources = newSources;
			$.publish('AudioController-BuffersLoadedIntoSources');
		};

		AudioController.prototype.getGainsForTracks = function() {
			var gains = [];
			_.forEach(this.sources, function(source) {
				var gainNode = this.audioCtx.createGain();
				source.connect(gainNode);
				gainNode.connect(this.audioCtx.destination);
				gains.push(gainNode);
			}, this);
			return gains;
		};

		/**
		 * it is called after audio is loaded
		 */
		AudioController.prototype.enable = function(dontEnableDrawer) {
			this.isEnabled = true;
			if (!dontEnableDrawer){
				$.publish('AudioDrawer-enable');	
			}
			
		};
		AudioController.prototype.disable = function(dontDisableDrawer) {
			this.stop();
			this.isEnabled = false;
			if (!dontDisableDrawer){
				$.publish('ToLayers-removeLayer');	
			}
		};

		AudioController.prototype.play = function(pos) {
			if (this.isPlaying || !this.isEnabled || this.sources.length === 0) return;
			if (this.reloadSources) {
				this.createSourcesFromBuffers.apply(this);
			}
			$.publish('Audio-play', this);
			if (pos) {
				this.pausedAt = pos * 1000;
			}
			var offset = 0;
			if (!this.pausedAt) {
				this.startedAt = Date.now();
			} else {
				this.startedAt = Date.now() - this.pausedAt;
				offset = this.pausedAt / 1000;
			}
			for (var i in this.sources) {
				this.sources[i].start(0, offset);
			}
			_updateLoopOnSources.call(this);
			this.isPlaying = true;

			var self = this;
			//on end playing, we stoped if it is in the end of the file 
			_.first(this.sources).onended = function() {
				if (self.getCurrentTime() > self.timeEndSong) {
					self.stop();
				}
			};
			$.publish('PlayerModel-onplay');
		};

		AudioController.prototype.getDuration = function() {
			var duration;
			_.each(this.bufferLoader.bufferList, function(buffer) {
				if (buffer && buffer.duration) {
					duration = buffer.duration;
				}
			});
			return duration;
		};
		AudioController.prototype.getBeatDuration = function() {
			return this.beatDuration;
		};
		/**
		 * 
		 * @param  {Number} now       in milliseconds
		 * @param  {Number} loopStart in seconds
		 * @param  {Number} loopEnd   in seconds
		 * @return {Number}           current time in milliseconds
		 */
		AudioController.prototype._calcTime = function(now, loopStart, loopEnd) {
			loopStart *= 1000; //loop boundaries in ms
			loopEnd *= 1000;
			var offsetLoopOn = this.offsetLoopOn || 0;
			now = now - offsetLoopOn * 1000; //we saved bookmark loopOn, and we substract it 

			if (now < loopStart) {
				return now;
			} else {
				var offset = now - loopStart;
				return loopStart + (offset % (loopEnd - loopStart));
			}
		};

		/**
		 * @return {Number} Time in ms (e.g. 1532.4)
		 */
		AudioController.prototype._getCurrentPlayingTime = function() {
			var now = Date.now() - this.startedAt /* + this.pos * 1000*/ ; //in ms
			if (this.sources.length > 0 && _.first(this.sources).loop) {
				return this._calcTime(now, _.first(this.sources).loopStart, _.first(this.sources).loopEnd);
			} else {
				return now;
			}
		};

		/**
		 * @return {Number} time in seconds (e.g. 1.5324)
		 */
		AudioController.prototype.getCurrentTime = function() {
			var now = this.isPlaying ? this._getCurrentPlayingTime() : this.pausedAt;
			return now / 1000;
		};

		AudioController.prototype._stopPlaying = function() {	
			for (var i in this.sources) {
				this.sources[i].stop(0);
			}
			this.isPlaying = false;
			this.pos = 0;
			this.reloadSources = true;
			$.publish('Audio-stop', this);
		};

		AudioController.prototype.pause = function() {
			if (!this.isPlaying) return;
			this._stopPlaying();
			this.pausedAt = this._getCurrentPlayingTime();
			$.publish('PlayerModel-onpause');
		};

		AudioController.prototype.stop = function() {
			if (this.isPlaying) {
				this._stopPlaying();
			}
			this.pausedAt = 0;
			$.publish('PlayerModel-onstop');
		};

		/**
		 * sets loop
		 * @param  {Number} from time start loop (in seconds)
		 * @param  {Number} to   time end loop (in seconds)
		 */
		AudioController.prototype.loop = function(from, to) {
			from = from || this.startMargin;
			to = to || this.timeEndSong + this.startMargin;
			this.presetLoop = {
				from: from,
				to: to
			};
			if (this.isPlaying) {
				_updateLoopOnSources.call(this);
				// this.offsetLoopOn is needed to get correct current time
				var now = (Date.now() - this.startedAt) / 1000;
				if (now > to) { // if cursor was after loop, we set offsetLoopOn
					this.offsetLoopOn = now - from;
				}
			}
		};

		AudioController.prototype.disableLoop = function() {
			if (this.sources && !this.loopSong){
				this.startedAt = Date.now() - this._getCurrentPlayingTime(); // we update startedAt like if we had made play from here	
				this.presetLoop = null;
				_updateLoopOnSources.call(this);
			}
		};

		/**
		 * Enables whole loop song, can only be done if is not playing
		 * @return {Boolean} returns true if action could be done, otherwise returns undefined (== falsy)
		 */
		AudioController.prototype.enableLoopSong = function() {
			if (!this.loopSong && !this.isPlaying){
				this.loop(this.startMargin, this.timeEndSong + this.startMargin);
				this.loopSong = true;
				return true;
			}
		};
		/**
		 * Disables whole loop song, can only be done if is not playing
		 * @return {Boolean} returns true if action could be done, otherwise returns undefined (== falsy)
		 */
		AudioController.prototype.disableLoopSong = function() {
			if (this.loopSong && !this.isPlaying){
				this.loopSong = false;
				this.disableLoop();
				return true;
			}
		};
		AudioController.prototype.isLoopSongEnabled = function() {
			return this.loopSong;
		};

		/**
		 * useful to draw wave
		 * @param  {Number} length     
		 * @param  {Number} startPoint 
		 * @param  {Number} endPoint   
		 * @return {Array}           
		 */
		AudioController.prototype.getPeaks = function(length, startPoint, endPoint) {
			startPoint = startPoint || 0;
			endPoint = endPoint || 1;

			var buffer = _.first(this.bufferLoader.bufferList),
				sampleStart = ~~(startPoint * buffer.length),
				sampleEnd = ~~(endPoint * buffer.length),
				sampleSize = (sampleEnd - sampleStart) / length,
				sampleStep = ~~(sampleSize / 10) || 1,
				channels = buffer.numberOfChannels,
				//splitPeaks = [],
				mergedPeaks = [],
				/*peaks,*/
				chan, start, end, max, c, i, j, value, absMax = 0;

			for (c = 0; c < channels; c++) {
				//peaks = splitPeaks[c] = [];
				chan = buffer.getChannelData(c);
				for (i = 0; i < length; i++) {
					start = ~~((i * sampleSize) + sampleStart);
					end = ~~(start + sampleSize);
					max = 0;
					for (j = start; j < end; j += sampleStep) {
						value = chan[j];
						if (value > max) {
							max = value;
							// faster than Math.abs
						} else if (-value > max) {
							max = -value;
						}
					}
					//peaks[i] = max;
					if (c === 0 || max > mergedPeaks[i]) {
						mergedPeaks[i] = max;
						if (max > absMax) absMax = max;
					}
				}
			}
			return mergedPeaks;
		};
		return AudioController;
	}
);