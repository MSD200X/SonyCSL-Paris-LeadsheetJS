define([
	'tests/songs/unfold/SimpleUnfoldTest',
	'modules/Unfold/src/StartLabel',
	'modules/Unfold/test/UnfoldTester',
	'modules/MidiCSL/src/converters/SongConverterMidi_MidiCSL'
	], function(SimpleUnfoldTest, StartLabel, UnfoldTester, SongConverterMidi_MidiCSL) {
		return function(assert){
			var unfoldTester = UnfoldTester(assert);
			var struct = unfoldTester.init(SimpleUnfoldTest);
			var startLabels = struct.getStartLabels();
			var endLabels = struct.getEndLabels();
			var sectionStartPoints = struct.getSectionStartPoints();
			
			assert.equal(Object.keys(endLabels).length, 7, "Total number of endLabels");
			unfoldTester.compareObject(endLabels.end_section_0_0, {
				section: 0,
				bar: 2,
				playIndex: 0
			},'end_section_0_0');	
			unfoldTester.compareObject(endLabels.end_section_0_1, {
				section: 0,
				bar: 3,
				playIndex: 1
			},'end_section_0_1');
			unfoldTester.compareObject(endLabels.Coda, {
				section: 0,
				bar: 1,
				playIndex: 0
			},'Coda');
			unfoldTester.compareObject(endLabels.end_section_1_0, {
				section: 1,
				bar: 1,
				playIndex: 0
			}, 'end_section_1_0');
			unfoldTester.compareObject(endLabels['DC al Coda'], {
				section: 1,
				bar: 1,
				playIndex: 0
			}, 'DC al Coda');
			unfoldTester.compareObject(endLabels.end_section_2_0, {
				section: 2,
				bar: 1,
				playIndex: 0
			},'end_section_2_0');
			unfoldTester.compareObject(endLabels.End, {
				section: 2,
				bar: 1,
				playIndex: 0
			}, 'End');	
				
			//START LABELS
			assert.equal(Object.keys(startLabels).length, 5, "Total number of startLabels");
			unfoldTester.compareObject(startLabels[StartLabel.CAPO], {
				section: 0,
				bar: 0,
				playIndex: 0
			}, 'Capo');
			unfoldTester.compareObject(startLabels.start_section_0, {
				section: 0,
				bar: 0,
				playIndex: 0
			},'start_section_0');
			unfoldTester.compareObject(startLabels.start_section_1, {
				section: 1,
				bar: 0,
				playIndex: 0
			},'start_section_1');
			unfoldTester.compareObject(startLabels.start_section_2, {
				section: 2,
				bar: 0,
				playIndex: 0
			},'start_section_2');
			unfoldTester.compareObject(startLabels[StartLabel.CODATO], {
				section: 2,
				bar: 0,
				playIndex: 0
			},'CodaTo');
			//Add tests for Start and end points ??
						
			var segments = struct.getSegments();
			assert.equal(segments.length, 5);
			
			unfoldTester.compareSegment(segments[0], [0,1,2], 0);
			unfoldTester.compareSegment(segments[1], [0,1,3], 0);
			unfoldTester.compareSegment(segments[2], [0,1], 1);
			unfoldTester.compareSegment(segments[3], [0,1], 0);
			unfoldTester.compareSegment(segments[4], [0,1], 2);

			struct.setUnfoldedLeadsheet(segments);
			
			var unfoldedSong = struct.leadsheet;
			
			var iBar = unfoldedSong.getStartBarNumberFromSectionNumber(1);
			var startBarOfA2 = unfoldedSong.getComponent('bars').getBar(iBar);
			assert.equal(startBarOfA2.keySignatureChange, "C", 'In A1, the key signature is changed, so we need to change it back to C in start of A2');

			//testing notes mapping
			var unfoldedNotes = unfoldedSong.notesMapper.noteIndexes;
			assert.equal(unfoldedNotes[0], 0, 'Testing note mappings: A(1) start');
			assert.equal(unfoldedNotes[7], 7, 'A(1) end');
			assert.equal(unfoldedNotes[8], 0, 'A(2) start');
			assert.equal(unfoldedNotes[14], 8, 'A(2) 2nd ending start');
			assert.equal(unfoldedNotes[28], 22, 'B end');
			assert.equal(unfoldedNotes[29], 0, 'A (from Da Capo)');
			assert.equal(unfoldedNotes[34], 5, 'A end (to Coda)');
			assert.equal(unfoldedNotes[35], 23, 'Coda Start');
			assert.equal(unfoldedNotes[43], 31, 'Coda End');

			//var midiSong = SongConverterMidi_MidiCSL.exportNotesToMidiCSL(unfoldedSong);
			
		};
	}
);