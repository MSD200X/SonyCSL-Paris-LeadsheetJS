define(['tests/songs/unfold/GertrudesBounce',
	'modules/Unfold/src/StartLabel',
	'modules/Unfold/src/EndLabel',
	'modules/Unfold/test/UnfoldTester'], function(GertrudesBounce, StartLabel, EndLabel, UnfoldTester){
	return function(assert){
		//Gertrude's Bounce (5193842b58e3383974000748) contains open repeats, and coda, coda2...etc.
		var unfoldTester = UnfoldTester(assert);
		var struct = unfoldTester.init(GertrudesBounce);
		var startLabels = struct.getStartLabels();

		assert.equal(Object.keys(startLabels).length, 13, 'number of StartLabels');
		unfoldTester.compareObject(startLabels[StartLabel.SEGNO], {
			section: 1,
			bar: 0,
			playIndex: 0
		}, 'Segno');

		unfoldTester.compareObject(startLabels[StartLabel.CODATO], {
			section: 7,
			bar: 0,
			playIndex: 0
		}, 'CodaTo');

		unfoldTester.compareObject(startLabels[StartLabel.CODA2TO], {
			section: 8,
			bar: 0,
			playIndex: 0
		}, 'Coda2To');
		
		var endLabels = struct.getEndLabels();
		assert.equal(Object.keys(endLabels).length, 16, 'number of EndLabels');

		unfoldTester.compareObject(endLabels[EndLabel.TOCODA2], {
			section: 0,
			bar: 5,
			playIndex: 0
		}, 'Coda2');

		unfoldTester.compareObject(endLabels['DS al Coda'], {
			section: 6,
			bar: 7,
			playIndex: 0
		}, 'DS al Coda');

		unfoldTester.compareObject(endLabels['DC al Coda2'], {
			section: 7,
			bar: 0,
			playIndex: 0
		}, 'DC al Coda2');

		var segments = struct.getSegments();
		assert.equal(segments.length, 17, 'number of segments');

	};
});