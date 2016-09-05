define([
	'mustache',
	'modules/core/src/SongModel',
	'utils/UserLog',
	'jquery',
	'pubsub',
	'text!modules/StructureEdition/src/StructureEditionTemplate.html',
], function(Mustache, SongModel, UserLog, $, pubsub, StructureEditionTemplate) {
	/**
	 * StructureEditionView creates structure edition template and link event from html to controller
	 * @exports StructureEdition/StructureEditionView
	 */
	function StructureEditionView(imgPath) {
		this.el = undefined;
		this.imgPath = imgPath;
		this.initSubscribe();
		this.initKeyboard();
		this.render();
	}

	StructureEditionView.prototype.render = function(parentHTML, callback) {
		//if (typeof this.el === "undefined" || (typeof this.el !== "undefined" && force === true)) {
		this.el = Mustache.render(StructureEditionTemplate, {
			'imgPath': this.imgPath
		});
	};

	/**
	 * Publish event after receiving dom events
	 */
	StructureEditionView.prototype.initController = function() {
		var fn;
		var publishTarget = 'StructureEditionView';
		$('#add-section').click(function() {
			fn = 'addSection';
			$.publish(publishTarget, fn);
		});
		$('#rem-section').click(function() {
			fn = 'removeSection';
			$.publish('StructureEditionView', fn);
		});
		$('#validateSectionTitle').click(function() {
			var name = $('#inputSectionName').val();
			fn = 'setSectionName';
			$.publish('StructureEditionView', [fn, name]);
		});
		$('#selectSectionRepeatTimes').change(function() {
			var repeatTimes = parseInt($(this).val(), 10) - 1; // number of repetition is the number of played times minus 1
			fn = 'setRepeatTimes';
			$.publish('StructureEditionView', [fn, repeatTimes]);
		});


		$('#add-bar').click(function() {
			fn = 'addBar';
			$.publish('StructureEditionView', fn);
		});
		$('#rem-bar').click(function() {
			fn = 'removeBar';
			$.publish('StructureEditionView', fn);
		});

		// Time Signature change
		$('#edit_each_time_signature_container select').change(function() {
			fn = 'setTimeSignature';
			var timeSignature = $(this).val();
			if (timeSignature === 'select') {
				return;
			}
			$.publish('StructureEditionView', [fn, timeSignature]);
		});

		// Tonality change
		$('#edit_each_tonality_container select').change(function() {
			fn = 'tonality';
			var tonality = $(this).val();
			$.publish('StructureEditionView', [fn, tonality]);
		});

		// Ending change
		$('#edit_each_ending_container select').change(function() {
			var ending = $(this).val();
			fn = 'ending';
			$.publish('StructureEditionView', [fn, ending]);
		});

		// // Style change
		// $('#edit_each_style_container select').change(function() {
		// 	var style = $(this).val();
		// 	fn = 'style';
		// 	$.publish('StructureEditionView-', [fn, style]);
		// });

		// Label change
		$('#edit_each_label_container select').change(function() {
			var label = $(this).val();
			fn = 'label';
			$.publish('StructureEditionView', [fn, label]);
		});

		// Sublabel change
		$('#edit_each_sublabel_container select').change(function() {
			var sublabel = $(this).val();
			fn = 'subLabel';
			$.publish('StructureEditionView', [fn, sublabel]);
		});
		$('#unfold').click(function() {
			$.publish('StructureEditionView', 'unfold');
		});
		$.subscribe('U-key', function() {
			$.publish('StructureEditionView','unfold')
		});

		$('#leadsheet_transpose').change(function() {
			var semiTons = Number($(this).val());
			fn = 'transposeSong';
			$.publish('StructureEditionView', [fn, semiTons]);
		});


	};

	StructureEditionView.prototype.initKeyboard = function(evt) {};



	/**
	 * Subscribe to model events
	 */
	StructureEditionView.prototype.initSubscribe = function() {
		var self = this;
		$.subscribe('StructureEditionModel-setUnfolded', function(el, unfolded) {
			var textButton = unfolded ? "Fold" : "Unfold";
			$("#unfold").val(textButton);
		});
		$.subscribe('StructureEditionModel-setSelectedSection', function(el, currentSection) {
			self._setSelectedSection(currentSection);
		});
		$.subscribe('StructureEditionModel-setSelectedBar', function(el, currentBar) {
			self._setSelectedBar(currentBar);
		});
		$.subscribe('StructureEditionModel-setKeySignature', function(el, keySignature) {
			self._setTonality(keySignature);
		});
		$.subscribe('StructureEditionModel-setTimeSignature', function(el, timeSignature) {
			self._setBarTimeSignature(timeSignature);
		});
	};


	StructureEditionView.prototype._setSelectedSection = function(currentSection) {
		this._setSectionName(currentSection.getName());
		this._setSectionRepeatTimes(currentSection.getRepeatTimes());
	};
	StructureEditionView.prototype._setSelectedBar = function(currentBar) {
		this._setEnding(currentBar.getEnding());
		this._setLabel(currentBar.getLabel());
		this._setSublabel(currentBar.getSublabel());
	};

	StructureEditionView.prototype._setSectionName = function(sectionName) {
		if ($('#inputSectionName').val() !== sectionName) {
			$('#inputSectionName').val(sectionName);
		}
	};
	StructureEditionView.prototype._setSectionRepeatTimes = function(repeatTimes) {
		if (typeof repeatTimes === "undefined") {
			repeatTimes = 1;
		} else {
			repeatTimes++;
		}
		if ($('#selectSectionRepeatTimes').val() !== repeatTimes) {
			$('#selectSectionRepeatTimes').val(repeatTimes);
		}
	};

	StructureEditionView.prototype._setBarTimeSignature = function(timeSignature) {
		if (typeof timeSignature === "undefined") {
			timeSignature = "select";
		}
		if ($('#edit_each_time_signature_container select').val() !== timeSignature.toString()) {
			$('#edit_each_time_signature_container select').val(timeSignature.toString());
		}
	};
	StructureEditionView.prototype._setTonality = function(tonality) {
		if (typeof tonality !== "undefined") {
			if ($('#edit_each_tonality_container select').val() !== tonality) {
				$('#edit_each_tonality_container select').val(tonality);
			}
		}
	};
	StructureEditionView.prototype._setEnding = function(ending) {
		if (typeof ending === "undefined") {
			ending = "none";
		}
		if ($('#edit_each_ending_container select').val() !== ending) {
			$('#edit_each_ending_container select').val(ending);
		}
	};
	StructureEditionView.prototype._setLabel = function(label) {
		if (typeof label === "undefined") {
			label = "none";
		}
		if ($('#edit_each_label_container select').val() !== label) {
			$('#edit_each_label_container select').val(label);
		}
	};
	StructureEditionView.prototype._setSublabel = function(sublabel) {
		if (typeof sublabel === "undefined") {
			sublabel = "none";
		}
		if ($('#edit_each_sublabel_container select').val() !== sublabel) {
			$('#edit_each_sublabel_container select').val(sublabel);
		}
	};
	return StructureEditionView;
});