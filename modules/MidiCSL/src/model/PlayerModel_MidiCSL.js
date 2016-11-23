/**
 * Publishable Events
 * PlayerModel_MidiCSL-onload
 * PlayerModel_MidiCSL-onplay
 * PlayerModel_MidiCSL-onstop
 * PlayerModel_MidiCSL-onpause
 * PlayerModel_MidiCSL-onloopstart
 * PlayerModel_MidiCSL-onfinish
 * PlayerModel_MidiCSL-onvolumechange
 */

//var NoteModel_MidiCSL = require('modules/MidiCSL/src/model/NoteModel_MidiCSL');


define([
		'jquery',
		'modules/core/src/SongModel',
		'modules/core/src/NoteModel',
		'modules/MidiCSL/src/converters/SongConverterMidi_MidiCSL',
		'modules/MidiCSL/src/model/SongModel_MidiCSL',
		'modules/PlayerView/src/ProgressBarModel',
		'Midijs',
		'pubsub',
		'underscore'
	],
	function($,
		SongModel,
		NoteModel,
		SongConverterMidi_MidiCSL,
		SongModel_MidiCSL,
		ProgressBarModel,
		MIDI,
		pubsub,
		_) {
		/**
		 * PlayerModel_MidiCSL is the main midi player class, it creates and reads a SongModel_MidiCSL object from a SongModel
		 * @exports MidiCSL/PlayerModel_MidiCSL
		 * @param {SongModel} songModel     Songmodel that will be read by the midi player
		 * @param {String} soundfontPath url to sond fount
		 * @param {Object} option        contain
			chordsInstrument
			melodyInstrument
			loop				// make the player loop over and over
			activeMetronome		// Boolean that indicates whether the metronome is active or not
			volume				// Float Main volume for all instruments it vary between 0 and 1
		*/
		function PlayerModel_MidiCSL(songModel, soundfontPath, options) {
			options = options || {};
			this.isReady = false; // boolean that indicates if player is ready to be played
			this.indexPosition = 0; // represent which notes have been lastly played
			this.playState = false; // playState indicate if the player is currently playing or not, (paused player will return false)
			this.songModel = songModel;
			this.isEnabled = true; //this is initialized on load
			if (songModel) {
				this.tempo = songModel.getTempo();
			}
			this.soundfontPath = soundfontPath;
			if (options.volume !== undefined) {
				// case that developper explicitly declared volume
				this.volumeFactor = options.volume;
			} else {
				// natural case (it use storage item to get last user volume)
				this.volumeFactor = this.initVolume(0.7);
			}
			this.cursorModel = options.cursorModel;
			this.cursorNoteModel = options.cursorNoteModel;

			this.activeMetronome = !!options.activeMetronome;
			// When loop attributes is set to true, player will restart after the last note (indefinitively)
			this.loop = !!options.loop;

			this.autoload = (typeof options.autoload !== "undefined") ? options.autoload : true;
			if (!!this.autoload) {
				this.load();
			}
			this._startTime = 0; // it contain the start timestamp  (when play is pressed), (it change only if player is in pause)
		}

		PlayerModel_MidiCSL.prototype.setSong = function(songModel) {
			if (songModel === undefined || !(songModel instanceof SongModel)) {
				throw "PlayerModel_MidiCSL- setSong, song model shouldn't be empty and should be a SongModel instance" + songModel;
			}
			this.songModel = songModel;
		};

		PlayerModel_MidiCSL.prototype.load = function() {
			if (MIDI) {
				this.instrumentsIndex = this.getAllInstrumentsIndex();
				this.instrumentsName = this.getAllInstrumentsName();
				this.initMidiChannels(this.instrumentsIndex);
				this.initMidiPlugin(this.instrumentsName);
			}
		};

		PlayerModel_MidiCSL.prototype.getReady = function() {
			return this.isReady;
		};

		PlayerModel_MidiCSL.prototype.setTempo = function(tempo) {
			if (!isNaN(tempo)) {
				this.tempo = tempo;
				this.songModel.setTempo(tempo);
			}
		};

		PlayerModel_MidiCSL.prototype.setReady = function(isReady) {
			if (isReady !== undefined) {
				this.isReady = isReady;
			}
		};

		PlayerModel_MidiCSL.prototype.getPlayState = function() {
			return this.playState;
		};

		PlayerModel_MidiCSL.prototype.doLoop = function() {
			return this.loop;
		};

		PlayerModel_MidiCSL.prototype.setLoop = function(loop) {
			if (!this.isEnabled) {
				return;
			}
			if (loop !== undefined) {
				this.loop = !!loop;
				$.publish('PlayerModel-toggleLoop', loop);
				return true;
			} else {
				return false;
			}
		};

		PlayerModel_MidiCSL.prototype.toggleLoop = function() {
			if (this.loop === true) {
				this.setLoop(false);
			} else {
				this.setLoop(true);
			}
			return this.loop;
		};

		PlayerModel_MidiCSL.prototype.mute = function() {
			if (this.playState) {
				this.volumeFactor = 0;
				$.publish('PlayerModel-onvolumechange', this.volumeFactor);
			}
		};

		PlayerModel_MidiCSL.prototype.unmute = function() {
			this.volumeFactor = this.initVolume();
			$.publish('PlayerModel-onvolumechange', this.volumeFactor);
		};

		PlayerModel_MidiCSL.prototype.doMetronome = function() {
			return this.activeMetronome;
		};

		PlayerModel_MidiCSL.prototype.muteMetronome = function() {
			this.activeMetronome = false;
			$.publish('PlayerModel-toggleMetronome', false);
		};

		PlayerModel_MidiCSL.prototype.unmuteMetronome = function() {
			this.activeMetronome = true;
			$.publish('PlayerModel-toggleMetronome', true);
		};

		PlayerModel_MidiCSL.prototype.initVolume = function(volume) {
			var oldVolume = localStorage.getItem("player-volume");
			if (oldVolume === null) {
				return volume;
			} else {
				$('#volume_controller').val(oldVolume*100);
				return oldVolume;
			}
		};

		PlayerModel_MidiCSL.prototype.setVolume = function(volume) {
			if (typeof volume === "undefined" || isNaN(volume)) {
				throw 'PlayerModel_MidiCSL - setVolume - volume must be a number ' + volume;
			}
			$.publish('PlayerModel-onvolumechange', volume);
			this.volumeFactor = volume;
			localStorage.setItem("player-volume", volume);
		};


		PlayerModel_MidiCSL.prototype.setChordsInstrument = function(instrument) {
			if (typeof instrument !== "undefined") {
				this.chords.instrument = instrument;
				$.publish('PlayerModel-onChordsInstrument', instrument);
				return true;
			} else {
				return false;
			}
		};

		PlayerModel_MidiCSL.prototype.setMelodyInstrument = function(instrument) {
			if (typeof instrument !== "undefined") {
				this.melody.instrument = instrument;
				$.publish('PlayerModel-onMelodyInstrument', instrument);
				return true;
			} else {
				return false;
			}
		};


		PlayerModel_MidiCSL.prototype.setPositionIndex = function(indexPosition, notesMapper) {
			if (typeof indexPosition === "undefined") {
				throw 'PlayerModel_MidiCSL - setPositionIndex - indexPosition must be defined ' + indexPosition;
			}
			if (notesMapper) {
				indexPosition = notesMapper.getFoldedIdx(indexPosition);
			}
			this.cursorModel.setPos(indexPosition);
			$.publish('CanvasLayer-refresh');
		};

		PlayerModel_MidiCSL.prototype.getBeatDuration = function(tempo) {
			if (typeof tempo === "undefined" || isNaN(tempo)) {
				throw 'PlayerModel_MidiCSL - getBeatDuration - tempo must be a number ' + tempo;
			}
			return 1000 * (60 / tempo);
		};

		PlayerModel_MidiCSL.prototype.getSongDuration = function() {
			return this.songDuration ? this.songDuration : 0;
		};

		PlayerModel_MidiCSL.prototype.getPlayPosition = function(pos, unfoldedSong, type) {

			pos = unfoldedSong.notesMapper.getFirstUnfoldedIdx(pos);
			var noteMng = unfoldedSong.getComponent('notes');

			return noteMng.getStartTieNotePos(pos);
		};

		/**
		 * Launch midi.noteon and noteoff instructions, this function is the main play function
		 * @param  {int} tempo in bpm, it influence how fast the song will be played
		 */
		PlayerModel_MidiCSL.prototype.play = function(tempo) {
			if (this.isEnabled === false || this.getReady() === false) {
				return;
			}
			if (typeof tempo === "undefined" || isNaN(tempo)) {
				tempo = 120;
			}
			this.emptyPlayNotes();
			var self = this;
			this.playState = true;
			$.publish('PlayerModel-onplay');
			// Convert songModel to a readable model that we can insert in SongModel_MidiCSL
			SongConverterMidi_MidiCSL.exportToMidiCSL(this.songModel, true, function(midiSong, unfoldedSong) {
				var midiSongModel = new SongModel_MidiCSL({
					song: midiSong
				});				
				if ($("input[name='metronome']").prop("checked")) {
					var metronome = midiSongModel.generateMetronome(self.songModel);
					midiSongModel.setFromType(metronome, 'metronome');
				}
				var song = midiSongModel.getSong();
				if (song.length !== 0) {

					var lastNote = midiSongModel.getLastNote(); // Looking for last note
					var beatDuration = self.getBeatDuration(tempo);
					self.progressBar = ProgressBarModel(unfoldedSong, beatDuration);

					self.noteTimeOut = []; // Keep every setTimeout so we can clear them on pause/stop
					var beatOfLastNoteOff = lastNote.getCurrentTime() + lastNote.getDuration();
					self.songDuration = beatOfLastNoteOff * beatDuration;
					var cursorPosition = self.cursorNoteModel ? self.cursorNoteModel.getPos() : [null];
					if (cursorPosition[0] == null) cursorPosition = [0, 0];
					var playFrom = 0;
					var playTo, note;
					var cursorPositionStart, cursorPositionEnd;
					if (cursorPosition[0] !== 0) {
						cursorPositionStart = self.getPlayPosition(cursorPosition[0], unfoldedSong);
						if (playFrom === 0) {
							playFrom = midiSongModel.getMelodySoundModelFromIndex(cursorPositionStart).getCurrentTime() * beatDuration;
						}
					}
					if (cursorPosition.length !== 1 && cursorPosition[1] !== cursorPosition[0]) {
						cursorPositionEnd = self.getPlayPosition(cursorPosition[1], unfoldedSong, {
							end: true
						});
						note = midiSongModel.getMelodySoundModelFromIndex(cursorPositionEnd);
						playTo = (note.getCurrentTime() + note.getDuration()) * beatDuration;
					}
					self._startTime = Date.now() - playFrom;

					//Classes for playing Midi. Parent (abstract) class
					var midiObj = {
						init: function(tempo, noteModel) {
							this.noteModel = noteModel;
							this.tempo = tempo;
							this.velocityMin = 30;
							this.randomVelocityRange = 25;
						},
						play: function() {
							MIDI.setVolume(this.getChannel(), this.getVolume());
							MIDI.chordOn(this.getChannel(), this.getNotesToPlay(), this.getVelocity());
							MIDI.chordOff(this.getChannel(), this.getNotesToPlay(), this.noteModel.getDuration() * (60 / this.tempo));
						},
						getNotesToPlay: function(){
							return this.noteModel.getMidiNote();
						},
						getVolume: function() {
							return this.volume * self.volumeFactor;
						},
						getChannel: function() {
							return this.channel;
						}, 
						getVelocity: function() {
							return Math.random() * this.randomVelocityRange + this.velocityMin;
						}
					};
					//child classes for notes, chords and metronome to play
					var noteMidiObj = _.extendOwn(Object.create(midiObj), {
						channel: 0,
						type: 'melody',
						volume: 127,
					});
					var chordsMidiObj = _.extendOwn(Object.create(midiObj), {
						channel: 0,
						type: 'chords',
						volume: 70,
						getVelocity: function() {
							return this.velocityMin;
						},
						getNotesToPlay: function(){
							return this.noteModel.getTransposeMidiNote(-12);
						},
					});
					var metronomeMidiObj = _.extendOwn(Object.create(midiObj), {
						channel: 9,
						volume: 80,
						setPlay: function(play) {
							this.doPlay = !!play;
						}
					});
					//we put them in object
					var midiTypes = {
						'melody': noteMidiObj,
						'chord': chordsMidiObj,
						'metronome': metronomeMidiObj
					};
					var playNoteFn = function(currentTime) {
						self.noteTimeOut.push(setTimeout(function() {
							var notesToPlay = _.filter(song, function(note) {
								return note.getCurrentTime() === currentTime;
							});
							if (!playTo || currentTime * self.getBeatDuration(tempo) < playTo) {
								self.progressBar.setPositionInPercent(Date.now() - self._startTime);
								_.forEach(notesToPlay, function(currentNote) {
									var midiObject = midiTypes[currentNote.getType()];
									midiObject.init(tempo, currentNote);
									midiObject.play();
								});
								var melodyNotes = _.filter(notesToPlay, function(note) {
									return note.getType() === 'melody';
								});
								// console.log(melodyNotes, notesToPlay);
								if (melodyNotes.length > 0) {
									var pos = melodyNotes[0].tieNotesNumber ? [melodyNotes[0].getNoteIndex(), melodyNotes[0].getNoteIndex() + melodyNotes[0].tieNotesNumber - 1] : melodyNotes[0].getNoteIndex();
									self.setPositionIndex(pos, unfoldedSong.notesMapper);
								}
							}
							if (_.last(notesToPlay) === lastNote || currentTime * self.getBeatDuration(tempo) >= playTo) {
								if (self.doLoop()) {
									self.stop(true); // TODO stop on setTimeout Else make it buggy (but without reseting position)
								}
								setTimeout((function() {
									if (!self.doLoop()) {
										self.stop();
										self.setPositionIndex(0, unfoldedSong.notesMapper);
										self.progressBar.setPositionInPercent(0);
										$.publish('PlayerModel-onfinish');
									} else {
										if (!playTo) {
											//if only one note was selected playTo will be undefined, loop has to restart from the beginning (not from playFrom),
											// otherwise, it would always loop from current note to the end, without going to the start when it arrives to the end of the song
											playFrom = 0;
										}
										self.play(tempo, playFrom);
									}
								}), lastNote.getDuration() * 1000);
							} 
						}, currentTime * self.getBeatDuration(tempo) - playFrom));
					};
					// for each different position in the song
					var timesPlayed = [];
					for (var i = 0, c = song.length; i < c; i++) {
						var currentNote = song[i];
						if (currentNote && timesPlayed.indexOf(currentNote.getCurrentTime()) === -1 && (currentNote.getCurrentTime() * beatDuration) >= playFrom && (!playTo || (currentNote.getCurrentTime() * beatDuration) <= playTo)) {
							timesPlayed.push(currentNote.getCurrentTime());
							// console.log('playTime' + currentNote.getCurrentTime())
							playNoteFn(currentNote.getCurrentTime());
						}
					}
				}
			});
		};

		PlayerModel_MidiCSL.prototype.stopAllNotes = function() {
 			if (typeof MIDI.stopAllNotes !== "undefined") {
				try {
					MIDI.stopAllNotes();
				} catch (e) {
					console.log(e);
				}
			}
			for (var i in this.noteTimeOut) {
				window.clearTimeout(this.noteTimeOut[i]);
			}
			this.noteTimeOut = [];
		};

		PlayerModel_MidiCSL.prototype.emptyPlayNotes = function() {
			this.stopAllNotes();
		};

		PlayerModel_MidiCSL.prototype.pause = function() {
			this.stopAllNotes();
			this.playState = false;
			$.publish('PlayerModel-onpause');
		};

		PlayerModel_MidiCSL.prototype.stop = function(dontResetPosition) {
			this.stopAllNotes();
			this.playState = false;
			if (!dontResetPosition && this.isEnabled) {
				if (self.progressBar)
					self.progressBar.setPositionInPercent(0);
			}
			$.publish('PlayerModel-onstop');
		};

		PlayerModel_MidiCSL.prototype.enable = function() {
			this.isEnabled = true;
		};
		PlayerModel_MidiCSL.prototype.disable = function() {
			this.stop();
			this.isEnabled = false;
		};


		PlayerModel_MidiCSL.prototype.getAllInstruments = function() {
			// check MIDI/Plugin.js for number (you have to remove 1)
			var instruments = {
				0: "acoustic_grand_piano",
				// 1: "bright_acoustic_piano",
				// 30 : "distortion_guitar",
				// 24 : "acoustic_guitar_nylon",
				// 25 : "acoustic_guitar_steel",
				// 26 : "electric_guitar_jazz",
				// 27 : "electric_guitar_clean",
				// 33 : "electric_bass_finger",
				// 34 : "electric_bass_pick",
				// 56 : "trumpet",
				// 61 : "brass_section",
				// 64 : "soprano_sax",
				// 65: "alto_sax",
				// 66 : "tenor_sax",
				// 67 : "baritone_sax",
				// 73 : "flute",
				116: "taiko_drum"
			};
			return instruments;
		};

		PlayerModel_MidiCSL.prototype.getAllInstrumentsIndex = function() {
			var instruments = this.getAllInstruments();
			var instrumentsIndex = [];
			for (var instru in instruments) {
				instrumentsIndex.push(instru);
			}
			return instrumentsIndex;
		};

		PlayerModel_MidiCSL.prototype.getAllInstrumentsName = function() {
			var instruments = this.getAllInstruments();
			var instrumentsName = [];
			for (var instru in instruments) {
				instrumentsName.push(instruments[instru]);
			}
			return instrumentsName;
		};

		PlayerModel_MidiCSL.prototype.initMidiChannels = function(instruments) {
			if (typeof instruments === "undefined") {
				throw 'PlayerModel_MidiCSL - initMidiChannels - instruments must be defined';
			}
			var channels = {};
			if (typeof instruments !== "undefined") {
				for (var i = 0, c = instruments.length; i < c; i++) {
					if (instruments[i] !== "116") {
						channels[i] = {
							instrument: parseInt(instruments[i], 10),
							number: parseInt(instruments[i], 10),
							program: parseInt(instruments[i], 10),
							mute: false,
							mono: false,
							omni: false,
							solo: false
						};
					}
				}
			}
			channels[9] = {
				instrument: 116,
				number: 116,
				program: 116,
				mute: false,
				mono: false,
				omni: false,
				solo: false
			};
			MIDI.channels = channels;
		};
		PlayerModel_MidiCSL.prototype.initMidiPlugin = function(instruments) {
			if (typeof instruments === "undefined") {
				throw 'PlayerModel_MidiCSL - initMidiPlugin - instruments must be defined';
			}
			var self = this;

			MIDI.loadPlugin({
				soundfontUrl: self.soundfontPath,
				instruments: instruments,
				onsuccess: self.MidiPluginIsReady.bind(self)
			});
		};

		PlayerModel_MidiCSL.prototype.MidiPluginIsReady = function() {
			this.setReady(true);
			this.enable();
			$.publish('PlayerModel-onload', 'midi');
		};

		return PlayerModel_MidiCSL;
	});