define([
	'modules/Audio/src/AudioController',
    'modules/Audio/src/AudioDrawer',
    'modules/Audio/src/AudioCursor',
    'modules/Audio/src/AudioPlayer',
    'modules/Audio/src/AudioAnimation',
    'modules/Audio/src/NotesCursorUpdater',
    'modules/Audio/src/ChordsCursorUpdater'
],function(AudioController, AudioDrawer, AudioCursor, AudioPlayer, AudioAnimation, NotesCursorUpdater, ChordsCursorUpdater){
	function AudioModule(song, params){
		params = params || {};
		var audio = new AudioController(song);
		new AudioPlayer(audio);


		if (params){
			var paramsDrawer = {
	          showHalfWave: true,
	          //drawMargins: true,
	          topAudio: -120,
	          heightAudio: 75,
    	    };
    	    // useAudioCursor unless it is explicitly set to false (default is true)
    	    var useAudioCursor = params.audioCursor === undefined || params.audioCursor === true; 
    	    var audioAnimation = null;
			if (useAudioCursor || params.notesCursor) {
				var notesCursor = params.notesCursor;
				var chordsCursor = params.chordsCursor;
    	    	audioAnimation = new AudioAnimation(params.playerView);

	    	    if (notesCursor) {
	    	    	var notesCursorUpdater = new NotesCursorUpdater(song, notesCursor);
	    	    	audioAnimation.addCursor(notesCursorUpdater);
	    	    }
	    	    if (chordsCursor) {
	    	    	var chordsCursorUpdater = new ChordsCursorUpdater(song, chordsCursor, params.chordSpaceManagerType);
	    	    	audioAnimation.addCursor(chordsCursorUpdater);	
	    	    }
	   	    }
	   	    if (params.viewer && params.audioDrawer !== false) {
	    		var audioDrawer = new AudioDrawer(song, params.viewer, useAudioCursor, audioAnimation, paramsDrawer);
	    		audio.drawer = audioDrawer; //needed for other modules like audioComments
	   	    }
		}

		return audio;
	}
	return AudioModule;
});