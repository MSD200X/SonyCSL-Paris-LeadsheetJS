define(['modules/core/src/SectionModel'], function(SectionModel) {
	return {
		run: function()
		{
			test("Section model", function(assert) {

				//constructor
				var section = new SectionModel({
					numberOfBars: 10,
					name: "A",
					repeatTimes:1,
					style:"jazz"
				});
				assert.equal(section.getName(),"A","testing constructor");
				assert.equal(section.getRepeatTimes(),1, "repeatTimes");
				assert.equal(section.getNumberOfBars(),10, "number of bars");
				assert.equal(section.getStyle(),"jazz", "style");

			});
		}
	};
});