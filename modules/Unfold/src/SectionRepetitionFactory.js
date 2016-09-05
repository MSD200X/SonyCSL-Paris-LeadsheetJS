define([
		'modules/Unfold/src/SectionFiniteRepetition',
		'modules/Unfold/src/SectionOpenRepetition'
	],
	/**
	 * Factory for SectionRepetitions. The java original code had circular dependencies which gives problems in requirejs
	 */
	function(SectionFiniteRepetition, SectionOpenRepetition) {
		var SectionRepetitionFactory = {
			/**
			 * @param  {LeadsheetStructure} structure 
			 * @param  {Number} section   
			 * @param  {Number} playIndex 
			 * @return {SectionRepetition} 
			 */
			get: function(structure, section, playIndex) {
				if (structure.getSection(section).hasOpenRepeats()) {
					var sectionOpenRep = Object.create(SectionOpenRepetition);
					sectionOpenRep.callInitValues(structure, section);
					return sectionOpenRep;
				} else {
					var sectionFiniteRep = Object.create(SectionFiniteRepetition);
					sectionFiniteRep.callInitValues(structure, section, playIndex);
					return sectionFiniteRep;
				}
			}
		};
		return SectionRepetitionFactory;
	});