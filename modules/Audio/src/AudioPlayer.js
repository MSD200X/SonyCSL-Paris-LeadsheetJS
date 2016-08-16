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
				if (this.$tplRendered) {
					this.$tplRendered.remove();
					this.$tplRendered = false;
				}
				self.gains = self.audio.getGainsForTracks();
				var tracks = [];
				_.forEach(self.gains, function(gain, index) {
					tracks.push({
						name: self.audio.sources[index].name,
						index: index
					});
					self.audio.sources[index].volume = self.defaultGainValue;
				});
				this.$tplRendered = $(Mustache.render(
					MultitrackMixerTemplate,
					{
						tracks: tracks,
					}
				));
				this.$tplRendered.find('input[type=range]').change(function(){
					var gainIdx = parseInt($(this).attr('id').split('-')[2], 10);
					var newVolume = $(this).val()/100;
					self._setGainValue(newVolume, self.gains[gainIdx], self.audio.sources[gainIdx]);
				});
				$('body').append(this.$tplRendered);
				$.publish("Audioplayer-multitrackMixerInserted", {$element: this.$tplRendered});
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
					self._setGainValue(self.audio.sources[index].volume, gainNode, self.audio.sources[index]);
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
		};

		AudioPlayer.prototype._setGainValue = function(volume, gainNode, source) {
			console.log(gainNode);
			source.volume = volume;
			volume = volume * this.masterVolume * 2 - 1;
			console.log('set volume to ' + volume + ' with masterVolume set to ' + this.masterVolume)
			gainNode.gain.value = volume;
		};

		return AudioPlayer;
	}
);