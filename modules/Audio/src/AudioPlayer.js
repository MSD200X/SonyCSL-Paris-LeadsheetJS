define(
	[
		'jquery', 
		'underscore',
		'mustache', 
		'text!modules/Audio/src/MultitrackMixerTemplate.html'
	],
	function($, _, Mustache, MultitrackMixerTemplate) {

		function AudioPlayer(audio, playerView){
			this.defaultGainValue = -5;
			this.muteValue = -40;
			this.masterVolume = $('#volume_controller').val()/100;
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
				if (self.$tplRendered) {
					self.$tplRendered.remove();
					self.$tplRendered = false;
				}
				self.gains = self.audio.getGainsForTracks();
				var tracks = [];
				// console.log(self.audio.sources)
				_.forEach(self.gains, function(gain, index) {
					tracks.push({
						name: self.audio.sources[index].name,
						index: index,
						gain: (self.audio.sources[index].volume !== undefined ? self.audio.sources[index].volume : self.defaultGainValue),
						minValue: self.muteValue
					});
					if (_.isUndefined(self.audio.sources[index].volume)) {
						self.audio.sources[index].volume = self.defaultGainValue;
					}
				});
				self.$tplRendered = $(Mustache.render(
					MultitrackMixerTemplate,
					{
						tracks: tracks,
					}
				));
				self.$tplRendered.find('input[type=range]').change(function(){
					var gainIdx = parseInt($(this).attr('id').split('-')[2], 10);
					var newVolume = $(this).val();
					self._setGainValue(newVolume, self.gains[gainIdx], self.audio.sources[gainIdx]);
				}).change();
				$('body').append(self.$tplRendered);
				$.publish("Audioplayer-multitrackMixerInserted", {$element: self.$tplRendered});
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
				self.masterVolume = volume;
				self.playerView.adaptSoundButton(volume);
				_.forEach(self.gains, function(gainNode, index){
					if (self.audio.sources[index].isMuted !== true) {
						self._setGainValue(self.audio.sources[index].volume, gainNode, self.audio.sources[index]);
					}
				});
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
			$(document).on('click', 'button.btn-mute-track', function() {
				var $btn = $(this);
				$btn.toggleClass('active');
				var gainIndex = $btn.parents('.track-gain-wrapper').index();
				if ($btn.hasClass('active')) {
					self._setGainValue(self.muteValue, self.gains[gainIndex]);
					self.audio.sources[gainIndex].isMuted = true;
				} else {
					self._setGainValue(self.audio.sources[gainIndex].volume, self.gains[gainIndex]);
					self.audio.sources[gainIndex].isMuted = false;
				}
			});
			$(document).on('click', 'button.btn-solo-track', function() {
				var $btn = $(this);
				$('button.btn-solo-track.active').not(this).removeClass('active');
				$btn.toggleClass('active');
				var gainIndex = $btn.parents('.track-gain-wrapper').index();
				_.forEach(self.gains, function(gainNode, index) {
					// default rule
					var newVolume = self.audio.sources[index].isMuted ? self.muteValue : self.audio.sources[index].volume;
					if (index !== gainIndex) {
						newVolume = $btn.hasClass('active') ? self.muteValue : newVolume;
					} else {
						newVolume = $btn.hasClass('active') ? self.audio.sources[index].volume : newVolume;
					}
					self._setGainValue(newVolume, gainNode);
				});
			});
		};

		AudioPlayer.prototype._setGainValue = function(volume, gainNode, source) {
			volume = parseInt(volume);
			if (source) {
				source.volume = volume;
			}
			if (volume === this.muteValue) {
				volume = 0;
			} else {
				volume = Math.pow(10, volume/20);
			}
			gainNode.gain.value = volume * this.masterVolume - 1;
			// console.log('gain set to ' + gainNode.gain.value + " with master " + this.masterVolume);
		};

		return AudioPlayer;
	}
);