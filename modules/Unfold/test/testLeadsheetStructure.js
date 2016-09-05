define([
/*	'tests/songs/AloneTogether',
	'tests/songs/unfold/DylansDelight',*/
	'modules/Unfold/test/testSimpleUnfoldTest',
	'modules/Unfold/test/testMichelle',
	'modules/Unfold/test/testGertrudesBounce',
	'modules/Unfold/test/testAloneTogether'

], function(testSimpleUnfoldTest, testMichelle, testGertrudesBounce, testAloneTogether) {
	return {
		run: function() {
			test("LeadsheetStructure", function(assert) {
				testSimpleUnfoldTest(assert);
				testAloneTogether(assert);
				testMichelle(assert);
				testGertrudesBounce(assert);
				//tested also with songs with coda where coda section has no name
			});
		}
	};
});