define(function(){
	
	/**
	 * Makes cursor notes move while playing
	 * @param {SongModel} song   song is a dependency and not 'NoteManager', because there are cases in which we change entirely the 
	 *                           note manager, so we need to reference to song
	 * @param {CursorModel} notesCursor 
	 */
	function NotesCursorUpdater(song, notesCursor){
		// this.song = song;
		this.unfoldedSong = song.clone();
		this.unfoldedSong.unfold();
		this.notesCursor = notesCursor;
		this.prevINote = 0;
		this.noteMng = this.unfoldedSong.getComponent('notes');
	}

	NotesCursorUpdater.prototype.update = function(audio) {
		var iNote = this.noteMng.getPrevIndexNoteByBeat(audio.getCurrentTime() / audio.beatDuration + 1);
		if (iNote != this.prevINote){
			var foldedIdx = this.unfoldedSong.notesMapper.getFoldedIdx(iNote);
			this.notesCursor.setPos(foldedIdx);	
			this.prevINote = iNote;
		}
	};
	return NotesCursorUpdater;
});