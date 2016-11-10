define([
		'modules/LSViewer/src/SymbolsPositioner',
		'modules/converters/MusicCSLJson/src/SongModel_CSLJson',
		'modules/core/src/SongModel',
		'tests/test-songs',
	], 
	function(SymbolsPositioner, SongModel_CSLJson, SongModel, testSongs) {
		return {
			run: function() {
				test("SymbolsPositioner", function(assert) {
					var songModel = SongModel_CSLJson.importFromMusicCSLJSON(testSongs.solarWithSymbols);
					// faked barWidthMANAGER with bars struct property
					var mockedBarWidthManager = {
						barsStruct: [
							[0,0,0,0],
							[0,0,0,0],
							[0,0,0,0]
						]
					};
					var symbolsPositioner = new SymbolsPositioner(songModel, mockedBarWidthManager, {}, ['chords', 'melody']);
					symbolsPositioner.setElementsPositonsByLine();
					var positionsBarO = symbolsPositioner.getPositionsForBarIndex(0);
					assert.equal(
						positionsBarO.PADDING_LEFT_CHORDS > 0,
						true, 
						"First bar contains both labels and section, so chords should have a padding-left"
					);
					assert.notEqual(
						positionsBarO.CHORDS_DISTANCE_STAVE,
						symbolsPositioner.defaultPositioningValues.CHORDS_DISTANCE_STAVE, 
						"First bar contains both labels and section, so chords should be higher than default value"
					);
					var positionsBar1 = symbolsPositioner.getPositionsForBarIndex(1);
					assert.notOk(
						positionsBar1.PADDING_LEFT_CHORDS,
						"Second has no label, so no left padding added for chords"
					);
					assert.notEqual(
						positionsBar1.CHORDS_DISTANCE_STAVE,
						symbolsPositioner.defaultPositioningValues.CHORDS_DISTANCE_STAVE, 
						"First bar contains both labels and section, but chords distance should be higher as well for the first line\'s bars"
					);
					var positionsBar4 = symbolsPositioner.getPositionsForBarIndex(4);
					assert.deepEqual(
						positionsBar4.CHORDS_DISTANCE_STAVE,
						symbolsPositioner.defaultPositioningValues.CHORDS_DISTANCE_STAVE, 
						"2nd line has neither labels nor sections, so default chords positioning is returned"
					);
					var positionsBar8 = symbolsPositioner.getPositionsForBarIndex(8);
					assert.notEqual(
						positionsBar8.CHORDS_DISTANCE_STAVE,
						symbolsPositioner.defaultPositioningValues.CHORDS_DISTANCE_STAVE, 
						"3rd line contains endings, so chords should be higher than default value"
					);
					assert.ok(
						positionsBar8.CHORDS_DISTANCE_STAVE < positionsBar1.CHORDS_DISTANCE_STAVE,
						"3rd line contains only endings and 1st contains both labels and sections, so chords shloud be higher on line 1 than on line 3"
					);
					assert.ok(
						positionsBar8.CHORDS_DISTANCE_STAVE < positionsBar1.CHORDS_DISTANCE_STAVE,
						"3rd line contains only endings and 2nd nothing special, so chords shloud be higher on line 3 than on line 2"
					);
				});
			}
		};
	}
);