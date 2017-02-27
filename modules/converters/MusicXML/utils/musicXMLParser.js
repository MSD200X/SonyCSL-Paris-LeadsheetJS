define(
	['vexflow', 'utils/NoteUtils'],
	function(Vex, NoteUtils) {

	/**
	 * VexFlow MusicXML - DOM-based MusicXML backend for VexFlow Documents.
	 * @author Daniel Ringwalt (ringw)
	 * https://github.com/ringw/vexflow/blob/musicxml/tests/document_tests.js
	 */


	var MusicXMLParser = {};

	/** @constructor */
	MusicXMLParser = function() {
		this.partList = [];
		this.partName = [];
		this.staveConnectors = [];
		// Create timewise array of arrays
		// Measures (zero-indexed) -> array of <measure> elements for each part
		this.measures = [];
		// Actual measure number for each measure
		// (Usually starts at 1, or 0 for pickup measure and numbers consecutively)
		this.measureNumbers = [];
		// Store number of staves for each part (zero-indexed)
		this.numStaves = [];
		// Track every child of any <attributes> element in array
		// (except <staves> which is stored in numStaves)
		// Measures -> parts ->
		//  object where keys are names of child elements ->
		//    data representing the attribute
		this.attributes = [];
	};

	MusicXMLParser.appearsValid = function(data) {
		if (typeof data == "string") {
			return data.search(/<score-partwise/i) != -1;
		}
		return (data instanceof Document) &&
			(data.documentElement.nodeName == 'score-partwise');
	};

	MusicXMLParser.prototype.parse = function(data) {
		if (typeof data == "string") {
			// Parse XML string
			if (window.DOMParser && typeof XMLDocument != "undefined") {
				var parser = new window.DOMParser();
				this.document = parser.parseFromString(data, "text/xml");
			} else if (window.ActiveXObject && new window.ActiveXObject("Microsoft.XMLDOM")) {
				this.document = new window.ActiveXObject("Microsoft.XMLDOM");
				this.document.async = "false";
				this.document.loadXML(data);
			} else throw new Vex.RERR("UnsupportedBrowserError", "No XML parser found");
		} else if (data instanceof Document) this.document = data;
		else {
			this.valid = false;
			throw new Vex.RERR("ArgumentError",
				"MusicXML requires XML string or DOM Document object");
		}
		this.documentElement = this.document.documentElement;
		if (this.documentElement.nodeName != 'score-partwise')
			throw new Vex.RERR("ArgumentError",
				"VexFlow only supports partwise scores");

		// Go through each part, pushing the measures on the correct sub-array
		var partNum = 0;
		Array.prototype.forEach.call(this.documentElement.childNodes, function(node) {
			if (node.nodeName == "part-list") this.parsePartList(node);
			else if (node.nodeName == "part") {
				var measureNum = 0;
				for (var j = 0; j < node.childNodes.length; j++) {
					var measure = node.childNodes[j];
					if (measure.nodeName != "measure") continue;
					if (!(measureNum in this.measures))
						this.measures[measureNum] = [];
					if (this.measures[measureNum].length != partNum) {
						// Some part is missing a measure
						Vex.LogFatal("Part missing measure");
						this.valid = false;
						return;
					}
					if (!(measureNum in this.measureNumbers)) {
						var num = parseInt(measure.getAttribute("number"));
						if (!isNaN(num)) this.measureNumbers[measureNum] = num;
					}
					this.measures[measureNum][partNum] = measure;
					var attributes = measure.getElementsByTagName("attributes")[0];
					if (attributes) this.parseAttributes(measureNum, partNum, attributes);
					measureNum++;
				}
				// numStaves defaults to 1 for this part
				if (!(partNum in this.numStaves))
					this.numStaves[partNum] = 1;
				partNum++;
			}
		}, this);

		// Create a brace for each part with multiple staves
		var partNum = 0;
		this.numStaves.forEach(function(staves) {
			if (staves > 1) this.staveConnectors.push({
				type: "brace",
				parts: [partNum],
				system_start: true
			});
			partNum++;
		}, this);

		this.valid = true;
	};

	MusicXMLParser.prototype.parsePartList = function(partListElem) {
		// We only care about stave connectors in part groups
		var partNum = 0;
		var partGroup = null;
		var staveConnectors = null; // array of stave connectors for part group
		Array.prototype.forEach.call(partListElem.childNodes, function(elem) {
			switch (elem.nodeName) {
				case "part-group":
					if (elem.getAttribute("type") == "start") {
						partGroup = [];
						staveConnectors = [];
						Array.prototype.forEach.call(elem.childNodes, function(groupElem) {
							switch (groupElem.nodeName) {
								case "group-symbol":
									if (groupElem.textContent == "bracket" || groupElem.textContent == "brace")
									// Supported connectors
										staveConnectors.push({
										type: groupElem.textContent,
										system_start: true
									});
								case "group-barline":
									if (groupElem.textContent == "yes")
										staveConnectors.push({
											type: "single",
											measure_start: true,
											system_end: true
										});
							}
						});
					} else if (elem.getAttribute("type") == "stop") {
						staveConnectors.forEach(function(connect) {
							connect.parts = partGroup;
							this.staveConnectors.push(connect);
						}, this);
						partGroup = staveConnectors = null;
					}
					break;
				case "score-part":
					if (partGroup) partGroup.push(partNum);
					var self = this;
					Array.prototype.forEach.call(elem.childNodes, function(groupElem) {
						if (groupElem.nodeName === "part-name") {
							self.partName[partNum] = groupElem.textContent;
						}
					});
					this.partList.push(partNum);
					partNum++;
					break;
			}
		}, this);
	}

	MusicXMLParser.prototype.isValid = function() {
		return this.valid;
	};

	MusicXMLParser.prototype.getNumberOfMeasures = function() {
		return this.measures.length;
	};

	MusicXMLParser.prototype.getMeasureNumber = function(m) {
		var num = this.measureNumbers[m];
		return isNaN(num) ? null : num;
	};

	// fill measures with needed rests to have the right number of beats
	MusicXMLParser.prototype.addNeededDurations = function(measure, p, notesBeatDuration) {
		if (notesBeatDuration < measure.part[p].measureInfos.time.num_beats) {
			var durationsToAdd = NoteUtils.getNotesDurationsToFillDuration(measure.part[p].measureInfos.time.num_beats - notesBeatDuration);
			for (var i in durationsToAdd) {
				measure.part[p].notes.unshift({
					duration: NoteUtils.getStringFromBeatDuration(durationsToAdd[i]) + 'r',
					chord: false
				});
			}
		}
		return measure;
	};

	MusicXMLParser.prototype.getMeasure = function(m) {
		var measureInfos = {
			time: this.getAttributes(m, 0).time,
		};
		var measure = {
			part: [],
		};
		for (var p = 0; p < this.measures[m].length; p++) {
			measure.part[p] = {};
			var attrs = this.getAttributes(m, p);
			if (typeof attrs.clef == "string") measureInfos.clef = attrs.clef;
			if (typeof attrs.key == "string") measureInfos.key = attrs.key;

			measureInfos.numberOfStaves = this.numStaves[p];
			measureInfos.stave = [];
			if (attrs.clef instanceof Array) {
				for (var s = 0; s < this.numStaves[p]; s++) {
					measureInfos.stave[s] = {
						clef: attrs.clef[s]
					};
				}
			}
			measure.part[p].measureInfos = measureInfos;
			measure.part[p].notes = [];
			var noteElems = this.measures[m][p].getElementsByTagName("note");
			var notesBeatDuration = 0;
			for (var i = 0; i < noteElems.length; i++) {
				var noteObj = this.parseNote(noteElems[i], attrs);
				notesBeatDuration += NoteUtils.getBeatFromStringDuration(noteObj.duration) * (noteObj.dot ? 1.5 : 1);

				if (noteObj.rest) noteObj.duration += "r";
				measure.part[p].notes.push(noteObj);
				if (noteObj.grace) continue; // grace note requires VexFlow support
			}
			// Song Model need to have all beats in a measure because notes and bars are not dependent
			measure = this.addNeededDurations(measure, p, notesBeatDuration);
			measure.part[p].chords = [];
			var chordElems = this.measures[m][p].getElementsByTagName("harmony");
			for (var i = 0, c = chordElems.length; i < c; i++) {
				measure.part[p].chords.push(this.parseChord(chordElems[i], attrs));
			}
		}
		return measure;
	};

	MusicXMLParser.prototype.getStaveConnectors = function() {
		return this.staveConnectors;
	};

	MusicXMLParser.prototype.parseAttributes = function(measureNum, partNum, attributes) {
		var attrs = attributes.childNodes;
		for (var i = 0; i < attrs.length; i++) {
			var attrObject = null;
			var attr = attrs[i];
			switch (attr.nodeName) {
				case "staves":
					// If this is the first measure, we use <staves>
					if (measureNum == 0)
						this.numStaves[partNum] = parseInt(attr.textContent);
					break;
				case "key":
					attrObject = this.getKeySignature(parseInt(attr.getElementsByTagName("fifths")[0].textContent));
					break;
				case "time":
					attrObject = (attr.getElementsByTagName("senza-misura").length > 0) ? {
						num_beats: 4,
						beat_value: 4,
						soft: true
					} : {
						num_beats: parseInt(attr.getElementsByTagName("beats")[0]
							.textContent),
						beat_value: parseInt(attr.getElementsByTagName(
							"beat-type")[0].textContent),
						soft: true // XXX: Should we always have soft voices?
					};
					break;
				case "clef":
					var number = parseInt(attr.getAttribute("number"));
					var sign = attr.getElementsByTagName("sign")[0].textContent;
					var line = parseInt(attr.getElementsByTagName("line")[0].textContent);
					var clef = (sign == "G" && line == "2") ? "treble" : (sign == "C" && line == "3") ? "alto" : (sign == "C" && line == "4") ? "tenor" : (sign == "F" && line == "4") ? "bass" : null;
					if (number > 0) {
						if (measureNum in this.attributes && partNum in this.attributes[measureNum] && this.attributes[measureNum][partNum].clef instanceof Array)
							attrObject = this.attributes[measureNum][partNum].clef;
						else attrObject = new Array(this.numStaves[partNum]);
						attrObject[number - 1] = clef;
					} else attrObject = clef;
					break;
				case "divisions":
					attrObject = parseInt(attr.textContent);
					break;
				default:
					continue; // Don't use attribute if we don't know what it is
			}
			if (!(measureNum in this.attributes))
				this.attributes[measureNum] = [];
			if (!(partNum in this.attributes[measureNum]))
				this.attributes[measureNum][partNum] = {};
			this.attributes[measureNum][partNum][attr.nodeName] = attrObject;
		}
		return attrObject;
	};

	MusicXMLParser.prototype.parseNote = function(noteElem, attrs) {
		var noteObj = {
			rest: false,
			chord: false
		};
		var notesTypesDurations = {
			'whole': 	"w",
			'half': 	"h",
			'quarter': 	"q",
			'eighth': 	"8",
			'16th': 	"16",
			'32nd': 	"32",
			'64th': 	"64",
			'128th': 	"128",
			'256th': 	"256"
		};
		noteObj.tickMultiplier = 1;
		noteObj.tuplet = null;
		Array.prototype.forEach.call(noteElem.childNodes, function(elem) {
			switch (elem.nodeName) {
				case "pitch":
					var step = elem.getElementsByTagName("step")[0].textContent;
					var octave = parseInt(elem.getElementsByTagName("octave")[0]
						.textContent);
					var alter = elem.getElementsByTagName("alter")[0];
					if (alter)
						switch (parseInt(alter.textContent)) {
							case 1:
								step += "#";
								break;
							case 2:
								step += "##";
								break;
							case -1:
								step += "b";
								break;
							case -2:
								step += "bb";
								break;
						}
					noteObj.keys = [step + "/" + octave.toString()];
					break;
				case "type":
					// Look up type
					noteObj.duration = notesTypesDurations[elem.textContent];
					break;
				case "dot": // Always follow type; noteObj.duration exists
					/*var duration = noteObj.duration,
						rest = duration.indexOf("r");
					if (noteObj.rest) duration = duration.substring(0, rest) + "dr";
					else duration += "d";
					noteObj.duration = duration;*/
					noteObj.dot = true;
					break;
				case "duration":
					var intrinsicTicks = {
						'numerator': 1 / (4 * parseInt(elem.textContent, 10)),
						'denominator': attrs.divisions,
					};
					if (isNaN(intrinsicTicks.numerator) || isNaN(intrinsicTicks.denominator))
						throw "InvalidMusicXML - Error parsing MusicXML duration";
					if (intrinsicTicks.denominator == 1)
						intrinsicTicks = intrinsicTicks.numerator;
					noteObj.intrinsicTicks = intrinsicTicks;
					// TODO: come up with duration string if we don't have a type
					if (!noteObj.duration) noteObj.duration = "4";
					break;
				case "time-modification":
					var num_notes = elem.getElementsByTagName("actual-notes")[0];
					var beats_occupied = elem.getElementsByTagName("normal-notes")[0];
					if (num_notes && beats_occupied) {
						num_notes = parseInt(num_notes.textContent);
						beats_occupied = parseInt(beats_occupied.textContent);
						if (!(num_notes > 0 && beats_occupied > 0)) break;
						noteObj.tickMultiplier = {
							'beats_occupied': beats_occupied,
							'num_notes': num_notes
						};
						noteObj.tuplet = {
							typeTuplet: "middle",
							num_notes: num_notes,
							beats_occupied: beats_occupied
						};
					}
					break;
				case "rest":
					noteObj.rest = true;
					var step = elem.getElementsByTagName("display-step")[0];
					var octave = elem.getElementsByTagName("display-octave")[0];
					if (step && octave)
						noteObj.keys = [step.textContent + "/" + octave.textContent];
					// FIXME: default length for rest only if length is full measure
					if (!noteObj.duration) noteObj.duration = "1r";
					break;
				case "grace":
					noteObj.grace = true;
					break;
				case "chord":
					noteObj.chord = true;
					break;
				case "voice":
					var voice = parseInt(elem.textContent);
					if (!isNaN(voice)) noteObj.voice = voice;
					break;
				case "staff":
					var stave = parseInt(elem.textContent);
					if (!isNaN(stave) && stave > 0) noteObj.stave = stave - 1;
					break;
				case "stem":
					if (elem.textContent == "up") noteObj.stem_direction = 1;
					else if (elem.textContent == "down") noteObj.stem_direction = -1;
					break;
				case "beam":
					var beam = elem.textContent;
					if (beam != "begin" && beam != "continue" && beam != "end") break;
					// "continue" overrides begin or end when there are multiple beams
					// TODO: support backward hook/forward hook,
					//       partial beam between groups of notes where needed
					if (noteObj.beam != "continue") noteObj.beam = beam;
					break;
				case "lyric":
					var text = elem.getElementsByTagName("text")[0];
					if (text) text = text.textContent;
					if (text) noteObj.lyric = {
						text: text
					};
					break;
				case "notations":
					Array.prototype.forEach.call(elem.childNodes, function(notationElem) {
						/*console.log('--------');
						console.log(notationElem);
						console.log(notationElem.nodeName);*/
						switch (notationElem.nodeName) {
							case "tied": // start-start/stop-stop vs begin-continue-end
								var tie = notationElem.getAttribute("type");
								switch (tie) {
									case "start":
										noteObj.tie = (noteObj.tie == "stop") ? "stop_start" : "start";
										break;
									case "stop":
										noteObj.tie = (noteObj.tie == "start") ? "stop_start" : "stop";
										break;
									default:
										throw "BadMusicXML - Bad tie: " + tie.toString();
								}
								//console.log(noteObj.tie);
								break;
							case "tuplet": // start-start/stop-stop vs begin-continue-end
								var tuplet = notationElem.getAttribute("type");
								switch (tuplet) {
									case "start":
										noteObj.tuplet.typeTuplet = (noteObj.tuplet.typeTuplet == "stop") ? "stop_start" : "start";
										break;
									case "stop":
										noteObj.tuplet.typeTuplet = (noteObj.tuplet.typeTuplet == "start") ? "stop_start" : "stop";
										break;
									default:
										throw "BadMusicXML - Bad tuplet: " + tuplet.toString();
								}
								//console.log(noteObj.tuplet.typeTuplet);
								break;
								// TODO: tuplet
						}
						//console.log('---');
					});
					break;
			}
		});
		// Set default rest position now that we know the stave
		if (noteObj.rest && !noteObj.keys) {
			var clef = attrs.clef;
			if (clef instanceof Array) clef = clef[noteObj.stave];
			switch (clef) {
				case "bass":
					noteObj.keys = ["D/3"];
					break;
				case "tenor":
					noteObj.keys = ["A/3"];
					break;
				case "alto":
					noteObj.keys = ["C/4"];
					break;
				case "treble":
				default:
					noteObj.keys = ["B/4"];
					break;
			}
		}
		return noteObj;
	};

	MusicXMLParser.prototype.parseChord = function(chordElems, attrs) {
		var chordObj = {};
		Array.prototype.forEach.call(chordElems.childNodes, function(elem) {
			switch (elem.nodeName) {
				case "root":
					chordObj.chordPitch = elem.getElementsByTagName("root-step")[0].textContent;
					if (typeof elem.getElementsByTagName("root-alter")[0] !== "undefined") {
						if (elem.getElementsByTagName("root-alter")[0].textContent === "-1") {
							chordObj.chordPitch += 'b';
						}
						if (elem.getElementsByTagName("root-alter")[0].textContent === "1") {
							chordObj.chordPitch += '#';
						}
					}
					break;
				case "kind":
					if (typeof elem.attributes["text"] !== "undefined") {
						chordObj.chordType = elem.attributes["text"].textContent;
					} else {
						chordObj.chordType = elem.textContent;
					}
					break;
			}
		});
		return chordObj;
	};

	/**
	 * Returns complete attributes object for measure m, part p (zero-indexed)
	 */
	MusicXMLParser.prototype.getAttributes = function(m, p) {
		var attrs = {};
		// Merge with every previous attributes object in order
		// If value is an array, merge non-null indices only
		for (var i = 0; i <= m; i++) {
			if (!(i in this.attributes)) continue;
			if (!(p in this.attributes[i])) continue;
			var measureAttrs = this.attributes[i][p];
			for (var key in measureAttrs) {
				var val = measureAttrs[key];
				if (val instanceof Array) {
					if (!(attrs[key] && attrs[key] instanceof Array))
						attrs[key] = [];
					for (var ind = 0; ind < val.length; ind++)
						if (typeof attrs[key][ind] == "undefined" || (typeof val[ind] != "undefined" && val[ind] != null))
							attrs[key][ind] = val[ind];
				} else attrs[key] = val;
			}
		}

		// Default attributes
		if (!attrs.time) attrs.time = {
			num_beats: 4,
			beat_value: 4,
			soft: true
		};

		return attrs;
	};

	/**
	 * Converts keys as fifths (e.g. -2 for Bb) to the equivalent major key ("Bb").
	 * @param {Number} number of fifths from -7 to 7
	 * @return {String} string representation of key
	 */
	MusicXMLParser.prototype.getKeySignature = function(fifths) {
		var keys = {
			"-7": "Cb",
			"-6": "Gb",
			"-5": "Db",
			"-4": "Ab",
			"-3": "Eb",
			"-2": "Bb",
			"-1": "F",
			"0": "C",
			"1": "G",
			"2": "D",
			"3": "A",
			"4": "E",
			"5": "B",
			"6": "F#",
			"7": "C#"
		};
		var key = keys[fifths];
		return key;
	};



	MusicXMLParser.prototype.fetch = function(uri) {
		var req = new XMLHttpRequest();
		req.open('GET', uri, false);
		req.send(null);
		if (req.readyState != 4) return undefined;
		return req.responseText;
	};


	return MusicXMLParser;
});