define([
	'jquery',
	'pubsub',
	'jquery_autocomplete',
	'utils/UserLog',
	'modules/Edition/src/HtmlInputElement',
	'utils/ChordUtils'
], function($, pubsub, jquery_autocomplete, UserLog, HtmlInputElement, ChordUtils) {
	function ChordSpaceEdition(songModel, viewer) {
		this.songModel = songModel;
		this.viewer = viewer;
	}
	
	ChordSpaceEdition.prototype.setMargins = function(marginRight, marginTop) {
		this.marginRight = marginRight;
		this.marginTop = marginTop;
	};

	ChordSpaceEdition.prototype.drawEditableChord = function(chordSpaceView, cursor) {
		this.undrawEditableChord();
		var position = cursor.getPos();
		position = position[0];
		this.chordSpaceView = chordSpaceView;
		this.htmlInput = this.createHtmlInput();

	};
	ChordSpaceEdition.prototype.undrawEditableChord = function() {
		if (this.htmlInput) {
			this.htmlInput.input.devbridgeAutocomplete('dispose');
			if (this.inputVal !== $(this.htmlInput.input).val()) {
				this.onChange(this.chordSpaceView, $(this.htmlInput.input).val());
			}
			this.htmlInput.remove();
			this.htmlInput = false;
			this.chordSpaceView = false;
		}
	};
	ChordSpaceEdition.prototype.createHtmlInput = function() {
		// Get chord value
		var chord = this.chordSpaceView._getChordAtThisPosition(this.songModel);
		this.inputVal = chord ? chord.toString('', false) : '';

		//we create html input, jquery object is in htmlInput.input (did not do getter because don't believe anymore in plain getters in javascript)
		var htmlInput = new HtmlInputElement(this.viewer, 'chordSpaceInput', this.chordSpaceView.getArea(), this.marginTop, this.marginRight);

		var input = htmlInput.input;
		// We create auto complete input
		var chordTypeList = (ChordUtils.allChords !== undefined) ? ChordUtils.allChords : ChordUtils.getAllChords();

		this.createAutocomplete(this.chordSpaceView, input, this.songModel, chordTypeList, this.inputVal);

		return htmlInput;
	};
	ChordSpaceEdition.prototype.createAutocomplete = function(chordSpaceView, input, songModel, list, inputVal) {
		var self = this;
		self.chordSpaceView = chordSpaceView;
		input.devbridgeAutocomplete({
			lookup: list,
			maxHeight: 200,
			lookupLimit: 40,
			width: 140,
			triggerSelectOnValidInput: false,
			showNoSuggestionNotice: true,
			autoSelectFirst: false,
			delimiter: "/",
			minChars: 0,
			lookupFilter: function(suggestion, originalQuery, queryLowerCase) {		
 				return suggestion.value.indexOf(originalQuery) !== -1;		
 			},
			// You may need to modify that if at first it appears incorrectly, it's probably because ur element is not absolute position
			// 'appendTo': myAbsolutedPositionElement, // dom or jquery (see devbridgeAutocomplete doc)
			noSuggestionNotice: 'Not a valid Chord',
			onSelect: function() {
				self.onChange(chordSpaceView, $(input).val());
			},
			onHide: function() {
				self.onChange(chordSpaceView, $(input).val());
				// self.onChange(chordSpaceView, $(input).val());
				self.undrawEditableChord();
			}
		});

		input.val(inputVal);
		input.focus(); // this focus launch autocomplete directly when value is not empty
		input.select(); // we select text so that is easier to edit

		// on tab call (tab doesn't trigger blur event)
		input.keydown(function(e) {
			var code = e.keyCode || e.which;
			if (code === 9 || code === 13) {
				self.onChange(chordSpaceView, $(this).val());
			}
		});
		// We use a filter function to make it easier for user to enter chords
		input.on('input propertychange paste', function() {
			$(this).val(self.filterFunction($(this).val()));
		});
	};

	ChordSpaceEdition.prototype.onChange = function(chordSpaceView, newChordString) {
		var currentChord = chordSpaceView._getChordAtThisPosition(this.songModel);
		var chordJson = ChordUtils.string2Json(newChordString);

		var removingChord = !!(chordJson.empty && currentChord !== undefined);
		var noUpdateToEmptyChord = !!(chordJson.empty && currentChord === undefined);
		var addingNewChord = (!chordJson.empty && currentChord === undefined);

		if (chordJson.error) {
			UserLog.logAutoFade('error', 'Chord "' + newChordString + '" not well formated');
		} else if (!noUpdateToEmptyChord && (removingChord || addingNewChord || !currentChord.equalsTo(chordJson))) {
			//last condition refers to when we are modifying existing chord
			console.log(chordJson, currentChord, chordSpaceView)
			$.publish('ChordSpaceView-updateChord', [chordJson, currentChord, chordSpaceView]);
		}
	};

	/**
	 * Set to upper case first notes, add a lot of replacement for french or not keyboard
	 * @param  {String} s input string
	 * @return {String}   output string
	 */
	ChordSpaceEdition.prototype.filterFunction = function(s) {
		function indexesOf(source, find) {
			var result = [];
			for (i = 0; i < source.length; ++i) {
				if (source.substring(i, i + find.length) == find) {
					result.push(i);
				}
			}
			return result;
		}
		s = s.replace(/^[a-z]/, function(m) {
			return m.toUpperCase();
		});
		s = s.replace(/\/[a-z]/, function(m) {
			return m.toUpperCase();
		});
		s = s.replace("-", "m");
		s = s.replace("è", "7");
		s = s.replace("ç", "9");
		s = s.replace("0", "halfdim7");
		s = s.replace("<", "|");
		s = s.replace(".", "dim7");
		s = s.replace("*", "M7");
		s = s.replace("mm", "mM");
		if (s.substring(0, 1) == "5") {
			s = s.replace("5", "%");
		}

		// replace 3 by # always except if it comes after 1 (e.g. A13) or after t (e.g. AM7(omit3) )
		var indexes = indexesOf(s, "3");
		for (var i in indexes) {
			if (s.charAt(indexes[i] - 1) != 1 && s.charAt(indexes[i] - 1) != "t") {
				s = s.substr(0, indexes[i]) + "#" + s.substr(indexes[i] + 1);
			}
		}

		s = s.replace(/^(.+)(p|²)$/, "($1)"); // parenthesis and ² 
		return s;
	};

	return ChordSpaceEdition;
});