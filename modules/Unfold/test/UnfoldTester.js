define([
	'modules/converters/MusicCSLJson/src/SongModel_CSLJson',
	'modules/Unfold/src/LeadsheetStructure'
	], function(SongModel_CSLJson, LeadsheetStructure) {
	
	var UnfoldTester = function(assert){
		var song;

		function compareObject(object, values, txt) {
			for (var index in values) {
				if (txt){
					assert.equal(object[index], values[index], txt + " - " + index);
				}
				else{
					assert.equal(object[index], values[index]);
				}
			}
		}

		function compareSegment(segment, bars, section, txt){
			assert.deepEqual(segment.bars,bars, txt);
			assert.equal(segment.sectionIndex, section);
		}

		function init(jsonFile) {
			song = SongModel_CSLJson.importFromMusicCSLJSON(jsonFile);
			return new LeadsheetStructure(song);
		}

		function getTotalNumBarsBySections(unfoldedSong) {
			var sections = unfoldedSong.getSections();
			var total = 0;
			for (var i = 0; i < sections.length; i++) {
				total += sections[i].getNumberOfBars();
			}
			return total;
		}
		function getTotalNumBarsByBars(unfoldedSong) {
			return unfoldedSong.getComponent('bars').getTotal();
		}

		function getSong(){
			return song;
		}
		return {
			init: init,
			compareSegment: compareSegment,
			compareObject: compareObject,
			getSong: getSong,
			getTotalNumBarsBySections: getTotalNumBarsBySections,
			getTotalNumBarsByBars: getTotalNumBarsByBars
		};
	};
	
	return UnfoldTester;
	
});