define(function() {
	var PointLabel = {
		TOCODAS: [],
		SOLOS: [],
		getToCodaLabels: function() {
			return this.TOCODAS;
		},
		/**
		 * @return {Array} array of Object with {label:'SEGNO|SEGNO2|...etc', type:'start|end'} 
		 */
		getSoloLabels: function() {
			return this.SOLOS;
		},
		addSoloLabel: function(label, type) {
			this.SOLOS.push({
				label: label,
				type: type
			});
		},
		create: function() {
			return Object.create(this);
		},
		fromString: function(name) {
			name = name.replace(" ", "_");
			return this[name];
		}
	};
	return PointLabel;
});