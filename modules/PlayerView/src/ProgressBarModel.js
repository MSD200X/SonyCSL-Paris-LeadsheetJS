define(['jquery', 'pubsub'], function($, pubsub) {
	var ProgressBarModel = function(song, beatDuration) {
		var songDuration = song.getComponent('notes').getTotalDuration() * beatDuration;
		return {
			setPositionInPercent: function(positionInPercent) {
				positionInPercent /= songDuration;
				$.publish('PlayerModel-positionPerCent', {
					positionInPercent: positionInPercent,
					songDuration: songDuration
				});
			}
		};
	};
	return ProgressBarModel;
});