define(['jquery', 'pubsub'], function($, pubsub) {
	function AudioPlayer(audio){
		this.audio = audio;
		this.gainNode = audio.getGlobalGain();
		// default gain value
		this.gainNode.gain.value = 0.7;
		this._initSubscribe();
		this.startPos = 0;
		this.endPos = 0;
		this.loopEnabled = false;
	}

	AudioPlayer.prototype._initSubscribe = function() {
		var self = this;
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
				console.log('set volume to ' + volume)
				self.gainNode.gain.value = volume;
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

	return AudioPlayer;
});