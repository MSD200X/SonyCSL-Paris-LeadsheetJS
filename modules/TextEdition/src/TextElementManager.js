define([
	'jquery',
	'pubsub',
	'modules/TextEdition/src/TextElementView',
	'modules/Edition/src/HtmlInputElement',
	"modules/Edition/src/EditionControllerInterface"
], function($, pubsub, TextElementView, HtmlInputElement, EditionControllerInterface) {
	/**
	 * Allow text in canvas to be clickabel and editable
	 * @exports TextEdition/TextElementManager
	 * @param {Object} fieldElement its a property of the viewer (LSViewer), which is created in the function draw, and contains de dimensions of the object. E.g.: titleView, or composerView which are created respectively in LSViewer._displayTitle() and LSViewer._displayComposer()
	 * @param {String} name         should be UpperCamelCase (first letter capital), and there should a setter and a getter in songModel. e.g. name = 'Title', functions songModel.getTitle() and songModel.setTitle() exists, same for name = 'Composer', songModel.setComposer(), songModel.getComposer(). TODO: composers will be treated as ana array, so we have function 'addComposer'. It is not solved yet how to update a composer (or several). When we'll do it, maybe we should pass set and get functions as arguments instead of 'name'
	 * @param {LSViewer} viewer       
	 * @param {SongModel} songModel    
	 * @param {Array} suggestions	Array of suggestions in case input need autocomplete
	 * 
	 */
	function TextElementManager(fieldElement, name, viewer, songModel, suggestions) {
		if (typeof fieldElement !== 'string' || typeof name !== 'string' || !viewer) {
			throw "TextElementManager error params";
		}
		$.extend(this, new EditionControllerInterface());
		this.CL_NAME = name;
		this.CL_TYPE = 'CLICKABLE';
		this.viewer = viewer;
		this.initSubscribe(fieldElement);
		this.textView = null;

		this.songModel = songModel;
		this.songSetNameFn = 'set' + name;
		this.songGetNameFn = 'get' + name;
		this.suggestions = suggestions;

		if (typeof this.songModel[this.songSetNameFn] !== 'function' || typeof this.songModel[this.songGetNameFn] !== 'function') {
			throw "TextElementManager - missing get or set function in songModel";
		}
	}

	TextElementManager.prototype.initSubscribe = function(fieldElement) {
		var self = this;
		$.subscribe('LSViewer-drawEnd', function(el, viewer) {
			// If Lsviewer doesn't have a canvas layer we do nothing, otherwise we need to update textelement
			if (viewer.canvasLayer) {
				//throw "TextElementManager needs CanvasLayer";
				self.textView = new TextElementView(viewer[fieldElement], viewer.scaler);
				viewer.canvasLayer.addElement(self);
				viewer.canvasLayer.refresh();
			}
		});
	};
	TextElementManager.prototype.getType = function() {
		return this.CL_TYPE;
	};

	TextElementManager.prototype.isEnabled = function() {
		return true;
	};

	TextElementManager.prototype.onSelected = function() {
		if (this.isEditable() !== true) {
			this.htmlInput = false;
			return;
		}
		var self = this;
		var inputVal = this.songModel[this.songGetNameFn].call(this.songModel);

		this.htmlInput = new HtmlInputElement(this.viewer, this.CL_NAME, this.textView.getArea());
		var input = this.htmlInput.input;

		// input.focus();
		input.val(inputVal);
		$(input).keyup(function(evt) {
			var keyCode = (evt === null) ? event.keyCode : evt.keyCode;
			var value = $(this).val();
			self.songModel[self.songSetNameFn].call(self.songModel, value);
			if (keyCode == 13) {
				self.disable();
			}
		});

		if (this.suggestions) {
			input.devbridgeAutocomplete({
				'lookup': this.suggestions,
				lookupFilter: function(suggestion, originalQuery, queryLowerCase) {
					return suggestion.value.toLowerCase().indexOf(queryLowerCase) === 0;
				},
				onSelect: function(suggestion) {
					self.songModel[self.songSetNameFn].call(self.songModel, suggestion.value);
				}
			});
		}
	};
	TextElementManager.prototype.enable = function() {
		//do nothing
	};
	TextElementManager.prototype.disable = function() {
		if (this.htmlInput) {
			this.htmlInput.input.devbridgeAutocomplete('dispose');
			this.htmlInput.remove();
			this.htmlInput = false;
			$.publish('ToViewer-draw', this.songModel);
		}
	};
	TextElementManager.prototype.inPath = function(coords) {
		return !!this.textView.isInPath(coords);
	};
	// no getYs function because it is not selectable
	return TextElementManager;
});