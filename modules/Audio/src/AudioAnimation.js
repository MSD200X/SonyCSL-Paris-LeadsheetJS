define(['jquery'], function($){
	/**
	 * This object centralizes restartAnimation loops. Different cursors can be 'subscribed' to it. They need to have an 'update' method
	 */ 
	function AudioAnimation(playerView){
		//this.animationId;
		this.cursors = [];
		this._initSubscribe();
		this.canvasLayer; //canvasLayer is initialised on viewer draw (see _initSubscribe)
		this.playerView = playerView;
	}

	AudioAnimation.prototype._initSubscribe = function() {
		var self = this;
		$.subscribe('LSViewer-drawEnd', function(el,viewer){
			self.canvasLayer = viewer.canvasLayer;
		});
		$.subscribe('Audio-play', function(el, audio) {
			self.restartAnimationLoop(audio);
		});
		$.subscribe('Audio-stop', function(el, audio) {
			if (self.animationId) {
				window.cancelAnimationFrame(self.animationId);
				self.animationId = null;
			}
		});
	};
	AudioAnimation.prototype.restartAnimationLoop = function(audio) {
		var self = this;
		if (!self.canvasLayer){
			throw "AudioAnimation.canvasLayer is undefined: probably event LSViewer-drawEnd was published before AudioAnimation was constructed";
		}
		var requestFrame = window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame;

		var audioTracksDuration = audio.getDuration();
		var lastProgressPercentage = 0;
		var frame = function() {
			self.animationId = requestFrame(frame);
			for (var i = 0; i < self.cursors.length; i++) {
				self.cursors[i].update(audio);
			}
			self.canvasLayer.refresh();
			var newProgressPercentage = Math.round(audio.getCurrentTime()/audioTracksDuration * 100);
			if (lastProgressPercentage !== newProgressPercentage) {
				lastProgressPercentage = newProgressPercentage;
				self.playerView.updateProgressbar(lastProgressPercentage, audioTracksDuration * 1000);
			}
		};
		frame();
	};

	AudioAnimation.prototype.addCursor = function(cursor) {
		this.cursors.push(cursor);
	};

	return AudioAnimation;
});