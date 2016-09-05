define(['modules/Unfold/src/RepetitionConfig'], function(RepetitionConfig) {
	var Repetition = {
		setValues: function(from, to, until) {
			//this.structure not initialized
			this.setValuesFromPoint(from);
			this.to = to;
			this.until = until;
		},
		setValuesFromPoint: function(fromEndPoint) {
			this.structure = fromEndPoint.leadsheetStructure;
			this.from = fromEndPoint;
		},
		getToPoint: function() {
			return this.to;
		},
		getFromPoint: function() {
			return this.from;
		},
		getUntilPoint: function() {
			return this.until;
		},
		setToPoint: function(to) {
			this.to = to;
		},
		getConfig: function() {
			if (!this.config) {
				this.config = new RepetitionConfig(this);
			}
			return this.config;
		},
		isAfter: function(cursor) {
			return this.getFromPoint().isAfter(cursor.point);
		},
		getTargetPoint: function() {
			return (this.config.doIt ? this.from : this.until);
		},
		updateCursor: function() {
			var toPoint = this.getToPoint();
			return {
				point: toPoint,
				playIndex: toPoint.playIndex
			};
		}
	};
	return Repetition;
});