define(function() {
	/**
	 * UnfoldingManager to get and restore components of a song
	 */
	return {
		getComponents: function(song) {
			return {
				sections: song.sections,
				bars: song.getComponent('bars').getBars(),
				chords: song.getComponent('chords').getChords(),
				notes: song.getComponent('notes').getNotes()
			};
		},
		restoreComponents: function(song, foldedComponents) {
			song.sections = foldedComponents.sections;
			song.getComponent('bars').setBars(foldedComponents.bars);
			song.getComponent('chords').setAllChords(foldedComponents.chords);
			song.getComponent('notes').setNotes(foldedComponents.notes);
			foldedComponents = [];
		}
	};
});