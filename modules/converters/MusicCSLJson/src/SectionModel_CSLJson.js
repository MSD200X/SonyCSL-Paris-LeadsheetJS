define(['modules/core/src/SectionModel'], function(SectionModel) {
	var SectionModel_CSLJson = {};


	SectionModel_CSLJson.importFromMusicCSLJSON = function(JSONSection, sectionModel) {
		if (!JSONSection || !sectionModel) {
			throw 'SectionModel_CSLJson - importFromMusicCSLJSON - bad arguments type';
		}
		sectionModel.setName(JSONSection.name);
		sectionModel.setNumberOfBars(JSONSection.bars ? parseInt(JSONSection.bars.length) : 0);
		sectionModel.setTimeSignature(JSONSection.timeSignature);
		sectionModel.setRepeatTimes(JSONSection.repeat === 'open' ? sectionModel.REPEAT_OPEN : JSONSection.repeat || 0);
		sectionModel.setStyle(JSONSection.style);
	};

	SectionModel_CSLJson.exportToMusicCSLJSON = function(sectionModel) {
		var sectionMusicCSLJSON = {};
		sectionMusicCSLJSON.name = sectionModel.getName();

		if (sectionModel.getTimeSignature())
			sectionMusicCSLJSON.timeSig = sectionModel.getTimeSignature().toString();

		if (sectionModel.getRepeatTimes())
			sectionMusicCSLJSON.repeat = sectionModel.getRepeatTimes();

		if (sectionModel.getStyle())
			sectionMusicCSLJSON.style = sectionModel.getStyle();

		return sectionMusicCSLJSON;
	};


	return SectionModel_CSLJson;
});