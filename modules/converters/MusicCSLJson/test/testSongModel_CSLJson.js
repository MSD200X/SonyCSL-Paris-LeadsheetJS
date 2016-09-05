define([
	'modules/converters/MusicCSLJson/src/SongModel_CSLJson', 
	'modules/core/src/SongModel', 
	'tests/test-songs',
	'tests/songs/IMeanYou',
	'tests/songs/unfold/DylansDelight'

	], function(SongModel_CSLJson, SongModel, testSongs, IMeanYou, DylansDelight) {
	return {
		run: function() {
			test("SongModel_CSLJson", function(assert) {
				
				var song = SongModel_CSLJson.importFromMusicCSLJSON(testSongs.leadSheetTimeSigChanges);
				
				assert.equal(song.getTonality(), "C", 'test key signature  by default');
				assert.equal(song.getTimeSignature(), "4/4", 'test time signature by default');
				assert.equal(song.getComponent('bars').getBar(1).getTimeSignatureChange().toString(),"3/4", 'imported time signature change');
				assert.equal(song.getComponent('bars').getBar(4).getKeySignatureChange(),"D", 'imported key signature change');
				
				var exportedCSLJson = SongModel_CSLJson.exportToMusicCSLJSON(song);
				
				assert.equal(exportedCSLJson.changes[0].bars[1].timeSignature, "3/4", 'exported time signature change');
				assert.equal(exportedCSLJson.changes[0].bars[4].keySignature, "D", 'exported key signature change');
				
				SongModel_CSLJson.importFromMusicCSLJSON(IMeanYou);
				
				//testing incomplete songs (with bars missing chords or melody)
				var someBarsWithNoMelody = {
					composer: "No one",
					title: "No chord on first beat and missing melody in some bars",
					time: "4/4",
					changes: [{
						id: 0,
						name: "A",
						bars: [{
							//0
							melody: [{
								keys: ["b/4"],
								duration: "w"
							}]
						}, {
							//1
							melody: [{
								keys: ["f/4"],
								duration: "w"
							}]
						}, {
							//2
							chords: [{
								p: "E",
								ch: "m",
								beat: 1
							}],
							melody: [{
								keys: ["a/4"],
								duration: "w"
							}]
						},{
							//3
							//no melody
						},{
							//4
							//no melody
							chords: [{
								p: "G",
								ch: "7",
								beat: 1
							}]
						},{
							//5
							//no melody
						}]
					}]
				};
				var song2 = SongModel_CSLJson.importFromMusicCSLJSON(someBarsWithNoMelody);
				var noteMng = song2.getComponent('notes');
			
				assert.equal(noteMng.getNotesAtBarNumber(0,song2).length, 1, 'one note in first bar');
				assert.equal(noteMng.getNotesAtBarNumber(3,song2).length, 1, 'whole notes in last three bars have been added (as they had originally no melody in the json');
				assert.equal(noteMng.getNotesAtBarNumber(4,song2).length, 1);
				assert.equal(noteMng.getNotesAtBarNumber(5,song2).length, 1);				
				
			});
		}
	}
});