define(['modules/converters/MusicCSLJson/src/SectionModel_CSLJson', 'modules/core/src/SectionModel'], function(SectionModel_CSLJson, SectionModel) {
	return {
		run: function() {
			test("SectionModel_CSLJson", function(assert) {
				var section = new SectionModel();
				var t = SectionModel_CSLJson.exportToMusicCSLJSON(section);
				assert.deepEqual(t, {"name":"", 'repeat': 0});

				var section = new SectionModel({"name":"A", 'repeatTimes':2, "numberOfBars":8, "style":"Bossa Nova"});
				var exp = SectionModel_CSLJson.exportToMusicCSLJSON(section);
				assert.deepEqual(exp, {"name":"A", 'repeat':2, "style":"Bossa Nova"});

				// testing import
				var newSection = new SectionModel();
				SectionModel_CSLJson.importFromMusicCSLJSON(exp, newSection);

				var exp2 = SectionModel_CSLJson.exportToMusicCSLJSON(newSection);
				assert.deepEqual(exp2, {"name":"A", 'repeat':2, "style":"Bossa Nova"});

				//section timeSignature
				var exampleSection = {
					id: 1,
					name: "B",
					timeSignature: "6/8",
					bars: [
						{
							chords: [{p: "A",ch: "m7",beat: 1}],
							melody: [
								{keys: ["B/4"], duration: "h", dot:1}
							]
						},
						{
							chords: [{p: "B",ch: "m7",beat: 1}],
							melody: [
								{keys: ["C/4"], duration: "h", dot:1}
							]
						},
						{
							timeSignature: "3/8",
							chords: [{p: "A",ch: "m7",beat: 1}],
							melody: [
								{keys: ["B/4"], duration: "h", dot:1}
							]
						}
					]
				};
				SectionModel_CSLJson.importFromMusicCSLJSON(exampleSection, newSection);
				assert.equal(newSection.getTimeSignature().toString(),"6/8", 'testing section with time signature');

			});
		}
	}
});
