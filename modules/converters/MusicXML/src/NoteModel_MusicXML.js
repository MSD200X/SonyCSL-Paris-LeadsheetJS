define(['modules/core/src/NoteModel'], function(NoteModel) {
	var NoteModel_MusicXML = {};

	NoteModel_MusicXML.importFromMusicXML = function(MusicXMLNote, note) {
		if(!note || !(note instanceof NoteModel)) {
			note = new NoteModel();
		}

		if (MusicXMLNote.hasOwnProperty('rest')) {
			note.isRest = MusicXMLNote.rest;
		}
		if (MusicXMLNote.hasOwnProperty('dot')) {
			note.setDot(1);
		}

		var duration = MusicXMLNote.duration;
		if ((duration.indexOf("r") !== -1)) {
			note.setDuration(duration.substring(0, duration.length - 1));
			note.isRest = true;
		} else {
			note.setDuration(duration);
			note.isRest = false;
		}

		if (MusicXMLNote.keys) {
			var parsedNote;
			for (var i = 0, c = MusicXMLNote.keys.length; i < c; i++) {
				parsedNote = string2Obj(MusicXMLNote.keys[i]);
				note.pitchClass[i] = parsedNote.pitchClass;
				note.accidental[i] = parsedNote.accidental;
				note.octave[i] = parsedNote.octave;
			}
		}

		note.setDot(MusicXMLNote.dot);
		note.setTie(MusicXMLNote.tie);
		if (typeof MusicXMLNote.tuplet === "object" && MusicXMLNote.tuplet !== null) {
			note.setTuplet(MusicXMLNote.tuplet.typeTuplet, MusicXMLNote.tuplet.num_notes + '/' + MusicXMLNote.tuplet.beats_occupied);
		}
		return note;

		function string2Obj(strPitch) {
			var re = /[a-g|A-G](#{1,2}|b{1,2}|n)?\/\d/;
			if (!strPitch.match(re)) throw "Error creating pitch " + strPitch + ". Should be in the form [pitch][acc]/[octave]. e.g. Ab/4";

			var parts = strPitch.split("/");

			var pitchClass = parts[0].substr(0, 1).toUpperCase();
			var accidental = parts[0].substr(1, parts[0].length);
			var octave = parts[1];

			return {
				pitchClass: pitchClass,
				accidental: accidental,
				octave: octave
			};
		}
	};

	return NoteModel_MusicXML;
});