define([
	'jquery',
	'mustache',
	'utils/UserLog',
	'pubsub',
	'text!modules/ChordEdition/src/ChordEditionTemplate.html',
], function($, Mustache, UserLog, pubsub, ChordEditionTemplate) {
	/**
	 * ChordEditionView creates chord edition template and link event from html to controller
	 * @exports ChordEdition/ChordEditionView
	 */
	function ChordEditionView(cursor, imgPath) {
		this.cursor = cursor;
		this.el = undefined;
		this.imgPath = imgPath;
		this.initKeyboard();
		this.render();
	}

	ChordEditionView.prototype.render = function() {
		this.el = Mustache.render(ChordEditionTemplate, {
			'imgPath': this.imgPath
		});
	};

	/**
	 * Function called by MainMenuView
	 */
	ChordEditionView.prototype.initController = function() {
	
		$('#copy_chord').click(function() {
			fn = 'copyChords';
			$.publish('ChordEditionView', fn);
		});
		$('#paste_chord').click(function() {
			fn = 'pasteChords';
			$.publish('ChordEditionView', fn);
		});
	};

	ChordEditionView.prototype.initKeyboard = function() {
		$.subscribe('updown-arrows', function(el, inc, evt) {
			fn = 'setChordPitch';
			if (evt.shiftKey){
				$.publish('ChordEditionView', [fn, inc]);	
			}		
		});
		$.subscribe('enter-key', function(el) {
			fn = 'toggleEditChord';
			$.publish('ChordEditionView', fn);
		});
		$.subscribe('ctrl-c-key', function(el) {
			fn = 'copyChords';
			$.publish('ChordEditionView', fn);
		});
		$.subscribe('supr-key', function(el) {
			fn = 'deleteChords';
			$.publish('ChordEditionView', fn);
		});
	};

	ChordEditionView.prototype.isEditMode = function(mode) {
		return this.editMode === mode;
	};

	return ChordEditionView;
});