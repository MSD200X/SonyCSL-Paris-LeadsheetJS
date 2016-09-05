define(['modules/StructureEdition/src/StructureEditionController',
	'modules/StructureEdition/src/StructureEditionModel',
	'modules/converters/MusicCSLJson/src/SongModel_CSLJson',
	'modules/Cursor/src/CursorModel',
	'modules/ChordEdition/src/ChordSpaceManager',
	'modules/ChordEdition/src/ChordEditionController',
	'modules/LSViewer/src/LSViewer',
	'modules/core/src/Intervals',
	'tests/test-songs'
], function(StructureEditionController, StructureEditionModel, SongModel_CSLJson, CursorModel, ChordSpaceManager, ChordEditionController, LSViewer, Intervals, testSongs) {
	return {
		run: function() {
			test("Structures Edition Controller", function(assert) {

				function basicFunctionalities () {
					var song = SongModel_CSLJson.importFromMusicCSLJSON(testSongs.simpleLeadSheet);
					var cM = new CursorModel(song.getComponent('notes'));
					var sec = new StructureEditionController(song, cM);
					var nm = song.getComponent('notes');
					var bm = song.getComponent('bars');

					// Sections
					var sections = song.getSections();


					assert.equal(sections.length, 1, "initially there is one section");
					assert.equal(sections[0].getNumberOfBars(), 8, 'initially 8 bars');
					cM.setPos(0);
					assert.equal(sec.addSection(), false, 'cannot create section if it is in first bar');

					cM.setPos(10); // we know 10th note is in measure 2 (starting from 0)
					sec.addSection();
					
					sections = song.getSections();

					assert.equal(sections.length, 2, "after adding section, there are two sections");
					assert.equal(sections[0].getNumberOfBars(), 2, 'after adding new section in bars 2, old section has 2 bars');
					assert.equal(sections[1].getNumberOfBars(), 6, 'and new section has 6 bars');

					cM.setPos(21); // we know 18th note is in measure 5
					sec.addSection();
					sections = song.getSections();
					sections.length = sections.length;

					assert.equal(sections.length, 3, "added section");
					assert.equal(sections[0].getNumberOfBars(), 2, 'after adding new section in bars 2, old section has 2 bars');
					assert.equal(sections[1].getNumberOfBars(), 3);
					assert.equal(sections[2].getNumberOfBars(), 3);

					cM.setPos(5); // we know 5th note is in measure 1
					sec.addSection();
					sections = song.getSections();
					

					assert.equal(sections.length, 4, "added section");
					assert.equal(sections[0].getNumberOfBars(), 1,'number of bars of each of the 4 sections correct');
					assert.equal(sections[1].getNumberOfBars(), 1);
					assert.equal(sections[2].getNumberOfBars(), 3);
					assert.equal(sections[3].getNumberOfBars(), 3);

					cM.setPos(10); // we go again to measure 2, (section 2)
					sec.removeSection();

					sections = song.getSections();
					
					assert.equal(sections.length, 3, "removed section: 3 sections");
					assert.equal(sections[0].getNumberOfBars(), 1);
					assert.equal(sections[1].getNumberOfBars(), 4);
					assert.equal(sections[2].getNumberOfBars(), 3);	
					
					cM.setPos(21); // we go again to measure 5, (section 2)
					sec.removeSection();

					sections = song.getSections();
					assert.equal(sections.length, 2, "removed section: 2 sections");
					assert.equal(sections[0].getNumberOfBars(), 1);
					assert.equal(sections[1].getNumberOfBars(), 7);
	
					cM.setPos(1); // we want to be in section 1
					assert.equal(sec.removeSection(), false, 'cannot remove section 0');
					

					//Add bar
					/*cM.setPos(0);
					sec.addBar();
					assert.equal(nm.getNotesAtBarNumber(0, song).toString(), "wr", "test bar has been created with E at start because it's first bar");*/
					cM.setPos(4);
					sec.addBar();
					assert.equal(nm.getNotesAtBarNumber(1, song).toString(), "wr", "test bar has been created with only silences");

					// Remove bar
					sec.removeBar();
					assert.equal(nm.getNotesAtBarNumber(0, song).toString(), "wr", "test remove bar");


					cM.setPos(0);
					var selBar = sec._getSelectedBars();
					assert.deepEqual(selBar, [0], "Selected bar");

					// tonality
					sec.tonality('G');
					assert.equal(song.getTonality(),"G", "In first bar, whole tonality is changed...");
					assert.equal(bm.getBar(selBar[0]).getKeySignatureChange(), undefined, "... and specific tonality of first bar is not set");
					assert.equal(bm.getBar(selBar[0] + 1).getKeySignatureChange(), undefined, "Tonality doesn't affect next bar");

					// ending
					sec.ending('BEGIN');
					assert.equal(bm.getBar(selBar[0]).getEnding(), "BEGIN", "Ending");
					assert.equal(bm.getBar(selBar[0] + 1).getEnding(), undefined, "Ending doesn't affect next bar");

					// style
					sec.style('Jazz');
					assert.equal(bm.getBar(selBar[0]).getStyle(), "Jazz", "Style");

					// label
					sec.label('Segno');
					assert.equal(bm.getBar(selBar[0]).getLabel(), "Segno", "Label");

					// sublabel
					sec.subLabel('DC al Coda');
					assert.equal(bm.getBar(selBar[0]).getSublabel(), "DC al Coda", "Sublabel");
					assert.equal(bm.getBar(selBar[0]).getSublabel(true), "DC_AL_CODA", "Sublabel formatted");

				}

				function timeSignatureChangesWithRests () {
					//TIME SIGNATURE CHANGES
					//Rules:
					//
					//change time signature only in those measures which are selected, and if inside the selection there is a time signature change, 
					//we change until the first time signature change

					// if only silences, we just change time signature and replace with appropriate time changes
					// if not only silences:
					//		- we try to cut figures into tied notes, but cannot cut 'tuplets', we forbid it in that case
					//		- if new time signature makes measures shorter than before, we fill with rests +
					//		- if new time signature makes measures longer than before, we add as many bars as needed. we fill with gaps if needed
					// 
					// 
					//With Silences
					//SetTimeSignature
					//Empty song in 4/4, with a whole rest in each bar
					var song = SongModel_CSLJson.importFromMusicCSLJSON(testSongs.wholeSilencesSong, song);

					var cM = new CursorModel(song.getComponent('notes'));
					var sec = new StructureEditionController(song, cM);
					var noteMng = song.getComponent('notes');

					assert.equal(noteMng.getNotes().toString(), 'wr,wr,wr,wr,wr,wr,wr,wr', 'initial notes for empty song');
					//we put cursor in note 5 (= bar 5, as there is one note per bar)				
					cM.setPos(5);
					sec.setTimeSignature("6/8");
					assert.equal(noteMng.getNotes().toString(), 'wr,wr,wr,wr,wr,h.r,wr,wr', 'notes after changing time signature to 6/8 in bar 5');

					assert.equal(song.getTimeSignatureAt(5).toString(), '6/8', 'time signature changed');
					assert.equal(song.getTimeSignatureAt(6).toString(), '4/4', 'time signature in the following bar is not changed');

					//we put cursor in notes 5 and 6 (= bars 5 and 6), we try to change the whole selection to 6/8, but everything will remain as it is
					//because it changes the time signature until first change in selection, and time signature until first time is already 6/8, so no changes
					cM.setPos([5, 8]);
					sec.setTimeSignature("6/8");
					assert.equal(noteMng.getNotes().toString(), 'wr,wr,wr,wr,wr,h.r,wr,wr', 'notes after changing time signature to 6/8 from bar 5 to 8 (remains the same)');
					assert.equal(song.getTimeSignatureAt(5).toString(), '6/8', 'time signature changed');
					assert.equal(song.getTimeSignatureAt(6).toString(), '4/4', 'time signature in the following bar is not changed');

					//in bar 4 we set to 2/2 
					cM.setPos(4);
					sec.setTimeSignature("2/2");
					assert.equal(
						noteMng.getNotes().toString(),
						/*bar 0*/
						'wr,wr,wr,wr,' + /*bar 4:*/ 'wr,' + /*bar 5*/ 'h.r,wr,wr',
						'notes after changing time signature to 2/2 in 4');
					assert.equal(song.getTimeSignatureAt(4).toString(), '2/2', 'time signature changed');
					assert.equal(song.getTimeSignatureAt(5).toString(), '6/8', 'time signature in the following bar is not changed');

					//we set last bar to 3/8
					var lastNoteIndex = noteMng.getTotal() - 1;
					cM.setPos(lastNoteIndex);
					sec.setTimeSignature("3/8");
					assert.equal(noteMng.getNotes().toString(), /*bar 0*/ 'wr,wr,wr,wr,' + /*bar 4:*/ 'wr,' + /*bar 5*/ 'h.r,wr,q.r', 'notes after changing time signature');
					assert.equal(song.getTimeSignatureAt(7), '3/8');
				}

				function timeSignatureChangesWithNotes () {
					//SONG WITH NOTES
					var simpleSong = SongModel_CSLJson.importFromMusicCSLJSON(testSongs.simpleLeadSheet);
					var cursor = new CursorModel(simpleSong.getComponent('notes'));
					var structEdition = new StructureEditionController(simpleSong, cursor);
					var barMng = simpleSong.getComponent('bars');
					var noteMng = simpleSong.getComponent('notes');

					cursor.setPos(5); //set cursor in first note of 2nd bar
					assert.equal(noteMng.getNotes(5, 9), "A/4-q,F/4-q,G/4-q,E/4-q");
					assert.equal(barMng.getTotal(), 8);
					assert.equal(simpleSong.getSections()[0].getNumberOfBars(), 8);

					//We change time singature to 3/8 in 2nd bar
					structEdition.setTimeSignature("3/8");
					assert.equal(noteMng.getNotes(5, 11), "A/4-q,F/4-8,F/4-8,G/4-q,E/4-q,8r", "after changing time signature, F is cut in 2 (they are tied)");
					assert.equal(barMng.getTotal(), 10, '2 bars added as a result of changing 2nd bar to 3/8');
					assert.equal(simpleSong.getSections()[0].getNumberOfBars(), 10);
					assert.equal(barMng.getBar(1).getTimeSignatureChange(), '3/8', 'in 2nd bar there is a time signature change to 3/8');
					assert.equal(barMng.getBar(4).getTimeSignatureChange(), '4/4', 'after adding 2 bars, in 4th bar we have set again a time signature change to 4/4');

					//We change time singature to 5/4 in 2nd bar
					cursor.setPos(cursor.getListLength() - 1); //set cursor in last note
					assert.equal(noteMng.getNotes(noteMng.getTotal() - 4, noteMng.getTotal()).toString(), 'A/4-q,F/4-q,G/4-q,E/4-q', 'last 4 notes');
					structEdition.setTimeSignature("5/4");
					assert.equal(noteMng.getNotes(noteMng.getTotal() - 5, noteMng.getTotal()).toString(), 'A/4-q,F/4-q,G/4-q,E/4-q,qr', 'last 5 notes, we have added a rest to fit in 5/4');
				}

				function transposingSong () {

					var song1Json = {
						composer: "Random Composer", title: "song3",
						time: "4/4",
						changes: [{
							id: 0,
							name: "A",
							bars: [{
								chords: [
									{p: "F##",ch: "M7",beat: 1},
									{p: "A##",ch: "m",beat: 2},
									{p: "G",ch: "",beat: 3},
									{p: "Bbb",ch: "7",beat: 4}],
								melody: [
									{keys: ["G##/4"],duration: "8"},
									{keys: ["a##/4"],duration: "8"},
									{keys: ["a#/4"],duration: "q"},
									{keys: ["Bb/4"],duration: "q"},
									{keys: ["Bbb/4"],duration: "q"}]
							}]
						}]
					};
	
					var song = SongModel_CSLJson.importFromMusicCSLJSON(song1Json),
						cursor = new CursorModel(song.getSongTotalBeats()),
						chordMng = song.getComponent('chords'), //["F##M7", "A##m", "G", "Bbb7"]
						noteMng = song.getComponent('notes'),  //["B##/4-8","G##/4-8" "A#/4-q", "Bb/4-q", "Bbb/4-q"]
						structEdition = new StructureEditionController(song, cursor);
								
					structEdition.transposeSong(4); //majorThird
					assert.deepEqual(chordMng.getChordsAsString(),["BM7", "D#m", "B", "C#7"], 'transposing up major third: chords');
					assert.deepEqual(noteMng.getNotesAsString(), ["C/5-8", "D/5-8", "C##/5-q", "Dn/5-q", "C#/5-q"], 'notes')

					var song2Json = {
						composer: "Random Composer", title: "song3",
						time: "4/4",
						changes: [{
							id: 0,
							name: "A",
							bars: [{
								chords: [
									{p: "F",ch: "M7",beat: 1},
									{p: "Bbb",ch: "m",beat: 2},
									{p: "G",ch: "",beat: 3},
									{p: "D##",ch: "7",beat: 4}],
								melody: [
									{keys: ["Fbb/4"],duration: "8"},
									{keys: ["A/4"],duration: "8"},
									{keys: ["Eb/4"],duration: "q"},
									{keys: ["B/4"],duration: "q"},
									{keys: ["A#/4"],duration: "q"}]
							}]
						}]
					};
					song = SongModel_CSLJson.importFromMusicCSLJSON(song2Json);
					cursor = new CursorModel(song.getSongTotalBeats());
					chordMng = song.getComponent('chords'); //["F##M7", "A##m", "G", "Bbb7"]
					noteMng = song.getComponent('notes');   //["Fbb/4-8","G##/4-8" "A#/4-q", "Bb/4-q", "Bbb/4-q"]
					structEdition = new StructureEditionController(song, cursor);
							
					structEdition.transposeSong(-6);//augmented fourth
					assert.deepEqual(chordMng.getChordsAsString(),["CbM7", "Ebm", "Db", "Bb7"], 'tranposing down augmented fourth: chords');
					assert.deepEqual(noteMng.getNotesAsString(), ["Bbb/3-8", "E/4-8", "B/3-q","F/4-q", "En/4-q"], 'notes'); //3rd note is B, not Bbb because first Bbb sets accidental of all following B/3 to bb
				
				}

				function complexOperations () {
					var simpleTransposeSong = SongModel_CSLJson.importFromMusicCSLJSON(testSongs.simpleLeadSheet);
					var seM = new StructureEditionModel();
					var cursor = new CursorModel(simpleTransposeSong.getComponent('notes'));
					var structEdition = new StructureEditionController(simpleTransposeSong, cursor, seM);
					var nm = simpleTransposeSong.getComponent('notes');

					//last bar looks like: | A/4-q, F/4-q, G/4-q, E/4-q |
					cursor.setPos(30); //set cursor to a note of last bar
					structEdition.setTimeSignature("3/4");

					//now last bar has been replaced by two bars: | A/4-q, F/4-q, G/4-q | E/4-q, hr |
					structEdition.addSection();
					assert.equal(1,1);

					cursor.setPos(0);
					var bar2 = nm.getNotesAtBarNumber(1, simpleTransposeSong);
					structEdition.removeBar();
					assert.deepEqual(nm.getNotesAtBarNumber(0, simpleTransposeSong), bar2, "Remove bar");
				}

				basicFunctionalities();
				timeSignatureChangesWithRests();
				timeSignatureChangesWithNotes();
				transposingSong();
				complexOperations();

			});
		}
	};
});