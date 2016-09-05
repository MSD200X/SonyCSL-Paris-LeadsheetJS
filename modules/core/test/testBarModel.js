define(['modules/core/src/BarModel'], function(BarModel) {
	return {
		run: function()
		{
			test("Bar model", function(assert) {

				var bar = new BarModel();

				// begining
				assert.throws(function() {
					bar.setBegining();
				},'throws error begining');
				bar.setBegining('test');
				assert.equal(bar.getBegining(), 'test', 'begining');

				// clef
				assert.throws(function() {
					bar.setClef();
				},'throws error clef');
				bar.setClef('treble');
				assert.equal(bar.getClef(), 'treble', 'clef');

				bar.setClef('');
				assert.equal(bar.getClef(), '', 'empty clef');

				// ending
				bar.setEnding();
				assert.equal(bar.getEnding(), undefined, 'ending');
				bar.setEnding('1');
				assert.equal(bar.getEnding(), '1');
				
				// style
				bar.setStyle();
				assert.equal(bar.getStyle(), '','style');
				bar.setStyle('Jazz');
				assert.equal(bar.getStyle(), 'Jazz');

				// time signature
				bar.setTimeSignatureChange();
				assert.equal(bar.getTimeSignatureChange(), undefined, 'time signature change');

				bar.setTimeSignatureChange('4/4');
				assert.equal(typeof bar.getTimeSignatureChange(), "object");

				// Tonality
				bar.setKeySignatureChange();
				assert.equal(bar.getKeySignatureChange(), '', 'tonality');

				bar.setKeySignatureChange('F');
				assert.equal(bar.getKeySignatureChange(), 'F', 'key signature change');

				// Label
				bar.setLabel();
				assert.equal(bar.getLabel(), '', 'label');

				bar.setLabel('Coda');
				assert.equal(bar.getLabel(), 'Coda');

				// SubLabel
				bar.setSublabel();
				assert.equal(bar.getSublabel(), '');

				bar.setSublabel('DC al Coda');
				assert.equal(bar.getSublabel(), 'DC al Coda');
				assert.equal(bar.getSublabel(false), 'DC al Coda');
				assert.equal(bar.getSublabel(true), 'DC_AL_CODA' , 'formated sublabel');

				var clonedBar = bar.clone();
				assert.deepEqual(clonedBar.getTimeSignatureChange(),bar.getTimeSignatureChange(),'testing clone');
				assert.deepEqual(clonedBar.getBegining(),bar.getBegining());
				assert.deepEqual(clonedBar.getEnding(),bar.getEnding());
				assert.deepEqual(clonedBar.getClef(),bar.getClef());
				assert.deepEqual(clonedBar.getKeySignatureChange(),bar.getKeySignatureChange());
				assert.deepEqual(clonedBar.getLabel(),bar.getLabel());
				assert.deepEqual(clonedBar.getSublabel(),bar.getSublabel());
				
			});

		}
	};
});