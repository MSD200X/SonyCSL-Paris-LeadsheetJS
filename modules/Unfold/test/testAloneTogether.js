define(['tests/songs/AloneTogether',
	'modules/Unfold/test/UnfoldTester'], function(AloneTogether, UnfoldTester){
		return function(assert) {
			var unfoldTester = UnfoldTester(assert);
			var struct = unfoldTester.init(AloneTogether);
			var songAloneTogether = struct.leadsheet;
			
			assert.deepEqual(songAloneTogether.getSection(0).baseBarNumbers,[0], 'barNumbers AloneTogether');
			assert.deepEqual(songAloneTogether.getSection(0).endingsBarNumbers.length, 0);

			assert.deepEqual(songAloneTogether.getSection(1).baseBarNumbers,[0,1,2,3,4,5,6,7,8,9,10,11]);

			assert.deepEqual(songAloneTogether.getSection(1).endingsBarNumbers, [[12,13], [14,15]]);

			assert.deepEqual(songAloneTogether.getSection(2).baseBarNumbers,[0,1,2,3,4,5,6,7]);
			assert.deepEqual(songAloneTogether.getSection(2).endingsBarNumbers.length, 0);

			assert.deepEqual(songAloneTogether.getSection(3).baseBarNumbers,[0, 1,2,3,4,5,6,7]);
			assert.deepEqual(songAloneTogether.getSection(3).endingsBarNumbers.length, 0);
		};
});