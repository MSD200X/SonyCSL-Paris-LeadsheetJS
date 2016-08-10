define(
	[
		'jquery', 
		'underscore',
		'mustache', 
		'text!modules/Audio/src/MultitrackMixerTemplate.html'
	],
	function($, _, Mustache, MultitrackMixerTemplate) {

		function AudioPlayer(audio, playerView){
			this.defaultGainValue = 0.7;
			this.audio = audio;
			this.playerView = playerView;
			// default gain value
			// this.gainNode.gain.value = this.defaultGainValue;
			this._initSubscribe();
			this.startPos = 0;
			this.endPos = 0;
			this.loopEnabled = false;
		}

		AudioPlayer.prototype._initSubscribe = function() {
			var self = this;
			$.subscribe("AudioController-BuffersLoadedIntoSources", function() {
				if (this.$tplRendered) {
					this.$tplRendered.remove();
					this.$tplRendered = false;
				}
				// self.gainNode = self.audio.getGlobalGain();
				self.gains = self.audio.getGainsForTracks();
				console.log(gains);
				var tracks = [];
				_.forEach(self.gains, function(gain, index) {
					tracks.push({
						name: 'Track ' + (index + 1),
						index: index
					});
				});
				var columnSize = Math.floor(12 / tracks.length);
				this.$tplRendered = $(Mustache.render(
					MultitrackMixerTemplate,
					{
						tracks: tracks,
						col: columnSize
					}
				));
				this.$tplRendered.find('input[type=range]').change(function(){
					var gainIdx = parseInt($(this).attr('id').split('-')[2], 10);
					var newVolume = $(this).val()/100;
					self._setGainValue(newVolume, self.gains[gainIdx]);
				});
				$('body').append(this.$tplRendered);
				console.log(this.$tplRendered);
			});
			$.subscribe("AudioCursor-clickedAudio", function(el, posCursor) {
				self.startPos = posCursor;
			 	self.audio.disableLoop();
			});
			$.subscribe("AudioCursor-selectedAudio", function(el, startPos, endPos) {
				self.startPos = startPos;
				self.endPos = endPos;
				self.audio.loop(startPos, endPos);
			});
			$.subscribe("ToPlayer-play", function() {
				self.audio.play(self.startPos);
			});
			$.subscribe("ToPlayer-pause", function() {
				self.startPos = null;
				self.audio.pause();
			});
			$.subscribe('ToPlayer-onVolume', function(el, volume) {
				if (self.gainNode) {
  					self._setGainValue(volume, self.gainNode);
  					self.playerView.adaptSoundButton(volume);
				}
			});
			$.subscribe("Audio-end", function(){
				self.startPos = null;
			});
			$.subscribe("ToPlayer-stop", function() {
				self.startPos = null;
				self.audio.stop();
			});
			$.subscribe('ToAudioPlayer-disable', function() {
				self.audio.disable(true); //true to not disable audio
			});
			$.subscribe('ToAudioPlayer-enable', function() {
				self.audio.enable(true); //true to not disable audio
			});
			$.subscribe('ToPlayer-playPause', function() {
				if (self.audio.isPlaying){
					$.publish('ToPlayer-pause');
				} else {
					self.audio.play(self.startPos);
				}
			});
			$.subscribe('ToPlayer-toggleLoop', function() {
				var toggle;
				if (self.loopEnabled){
					toggle = self.audio.disableLoopSong();
				}else{
					toggle = self.audio.enableLoopSong();
				}
				if (toggle){
					self.loopEnabled = !self.loopEnabled;
					$.publish('PlayerModel-toggleLoop', self.loopEnabled);
				}
			});
		};

		AudioPlayer.prototype._setGainValue = function(volume, gainNode) {
			console.log(gainNode);
			volume = volume * 2 - 1;
			console.log('set volume to ' + volume)
			gainNode.gain.value = Math.sign(volume) * Math.pow(volume, 2);
		};

		return AudioPlayer;
	}
);