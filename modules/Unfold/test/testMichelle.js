define([
	'tests/songs/unfold/Michelle',
	'modules/Unfold/src/StartLabel',
	'modules/Unfold/src/EndLabel',
	'modules/Unfold/test/UnfoldTester'
], function(Michelle, StartLabel, EndLabel, UnfoldTester) {
	return function(assert) {

		/**
		 * Michelle (5193843c58e3383974000dda) contains Segno, Coda, and Endings
		 */

		var unfoldTester = UnfoldTester(assert);
		var struct = unfoldTester.init(Michelle);
		var startLabels = struct.getStartLabels();
		//START LABELS
		assert.equal(Object.keys(startLabels).length, 6, "Total number of startLabels");
		unfoldTester.compareObject(startLabels[StartLabel.CAPO], {
			section: 0,
			bar: 0,
			playIndex: 0
		}, 'CAPO');

		unfoldTester.compareObject(startLabels.start_section_0, {
			section: 0,
			bar: 0,
			playIndex: 0
		}, 'start_section_0');

		unfoldTester.compareObject(startLabels.start_section_1, {
			section: 1,
			bar: 0,
			playIndex: 0
		}, 'start_section_1');

		unfoldTester.compareObject(startLabels.start_section_2, {
			section: 2,
			bar: 0,
			playIndex: 0
		}, 'start_section_2');

		unfoldTester.compareObject(startLabels[StartLabel.SEGNO], {
			section: 1,
			bar: 6,
			playIndex: 0
		}, 'SEGNO');

		unfoldTester.compareObject(startLabels[StartLabel.CODATO], {
			section: 2,
			bar: 0,
			playIndex: 0
		}, 'CODATO');

		var endLabels = struct.getEndLabels();
		assert.equal(Object.keys(endLabels).length, 7, "Total number of endLabels");

		unfoldTester.compareObject(endLabels.end_section_0_0, {
			section: 0,
			bar: 5,
			playIndex: 0
		}, 'end_section_0_0');

		unfoldTester.compareObject(endLabels.end_section_1_0, {
			section: 1,
			bar: 15,
			playIndex: 0
		}, 'end_section_1_0');

		unfoldTester.compareObject(endLabels.end_section_1_1, {
			section: 1,
			bar: 16,
			playIndex: 1
		}, 'end_section_1_1');
		unfoldTester.compareObject(endLabels[EndLabel.TOCODA], {
			section: 1,
			bar: 14,
			playIndex: 0
		}, 'Coda');

		unfoldTester.compareObject(endLabels['DS al Coda'], {
			section: 1,
			bar: 16,
			playIndex: 1
		}, 'DS al Coda');

		unfoldTester.compareObject(endLabels.end_section_2_0, {
			section: 2,
			bar: 11,
			playIndex: 0
		}, 'end_section_2_0');

		unfoldTester.compareObject(endLabels[EndLabel.END], {
			section: 2,
			bar: 11,
			playIndex: 0
		}, 'End');

		//Add tests for Start and end points ??
		var segments = struct.getSegments();
		assert.equal(segments.length, 5);
		unfoldTester.compareSegment(segments[0], [0, 1, 2, 3, 4, 5], 0);
		unfoldTester.compareSegment(segments[1], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 1);
		unfoldTester.compareSegment(segments[2], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16], 1);
		unfoldTester.compareSegment(segments[3], [6, 7, 8, 9, 10, 11, 12, 13, 14], 1);
		unfoldTester.compareSegment(segments[4], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 2);
		struct.setUnfoldedLeadsheet(segments);

		var unfoldedSong = struct.leadsheet;
		assert.equal(unfoldTester.getTotalNumBarsByBars(unfoldedSong), 59);
		assert.equal(unfoldTester.getTotalNumBarsByBars(unfoldedSong), unfoldTester.getTotalNumBarsBySections(unfoldedSong));
	};
});