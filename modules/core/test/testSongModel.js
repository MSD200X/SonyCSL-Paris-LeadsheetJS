define([
	'tests/test-songs',
	'modules/core/src/SongModel',
	'modules/converters/MusicCSLJson/src/SongModel_CSLJson',
	'modules/core/src/TimeSignatureModel'
], function(testSongs, SongModel, SongModel_CSLJson, TimeSignatureModel) {
	return {
		run: function() {

			test("SongModel", function(assert) {

				var song = SongModel_CSLJson.importFromMusicCSLJSON(testSongs.simpleLeadSheet, new SongModel());

				//	CHANGES IN TIME AND KEY SIGNATURES: TESTED ALSO ON BARSITERATOR
				var songTimeSigChanges = SongModel_CSLJson.importFromMusicCSLJSON(testSongs.leadSheetTimeSigChanges);
				//	song: 4/4
				//  sections:
				// 			A 			|	|3/4|	|2/4|4/4|	|	|	|
				//		global   numBar 0
				//	(start beats 		1	5	8	11	13	17	21	25	29)
				//
				// 			B (6/8)		|	|	|3/8|
				//  	global   numBar 8
				// 			C 			|	|
				//  	global   numBar 11 			
				// 			D (2/4)		| 	|
				//  	global   numBar 12
				// 			E 			|	|
				//  	global   numBar 13
				//  	    F (3/4) 	|4/4| 			
				//  	global   numBar 14

				assert.equal(songTimeSigChanges.getTimeSignatureAt(0).toString(), "4/4", "song time signature");
				assert.equal(songTimeSigChanges.getTimeSignatureAt(1).toString(), "3/4", "bar time signature changes");
				assert.equal(songTimeSigChanges.getTimeSignatureAt(3).toString(), "2/4");
				assert.equal(songTimeSigChanges.getTimeSignatureAt(4).toString(), "4/4");
				assert.equal(songTimeSigChanges.getTimeSignatureAt(8).toString(), "6/8", "section time signature");
				assert.equal(songTimeSigChanges.getTimeSignatureAt(11).toString(), "3/8", "get previous bar time signature change");
				assert.equal(songTimeSigChanges.getTimeSignatureAt(13).toString(), "2/4", "get previous  section time signature change");
				assert.equal(songTimeSigChanges.getTimeSignatureAt(14).toString(), "4/4", "priority to bar change when both at the same time");

				assert.equal(songTimeSigChanges.getKeySignatureAt(2), "C", "get original key signature");
				assert.equal(songTimeSigChanges.getKeySignatureAt(4), "D", "get key signature at bar change");
				assert.equal(songTimeSigChanges.getKeySignatureAt(5), "D", "get key signature after it changed, from another bar");
				assert.equal(songTimeSigChanges.getKeySignatureAt(8), "D", "get key signature after it changed, from another section");



				assert.deepEqual(songTimeSigChanges.getBarDivisionsBetweenBeats(0, 29), [4, 3, 3, 2, 4, 4, 4, 4], 'total divisions (exceeding beat boundaries)');
				assert.deepEqual(songTimeSigChanges.getBarDivisionsBetweenBeats(5, 14), [3, 3, 2, 1]);
				assert.deepEqual(songTimeSigChanges.getBarDivisionsBetweenBeats(1.5, 9), [0.5, 3, 3, 1], 'when does not at exact beat, first adds silences to fill beat (it is more consistent like that)');
			});
		}
	};
});