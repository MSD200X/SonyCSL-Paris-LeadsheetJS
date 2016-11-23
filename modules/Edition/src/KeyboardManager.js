define(['utils/NoteUtils',
	'jquery',
], function(NoteUtils, $) {
	/**
	 * KeyboardManager allows to interact with keyboard using pubsub events
	 * @exports Edition/KeyboardManager
	 */
	function KeyboardManager(test) {

		var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;

		function stopEvent(evt) {
			evt.preventDefault();
			evt.stopPropagation();
			return false;
		}

		function preventBackspace(evt, d) {
			var doPrevent = false;
			if (d.tagName.toUpperCase() === 'TEXTAREA' || (d.tagName.toUpperCase() === 'INPUT' && (d.type.toUpperCase() === 'TEXT' || d.type.toUpperCase() === 'PASSWORD' || d.type.toUpperCase() === 'FILE' || d.type.toUpperCase() === 'NUMBER'))) {
				doPrevent = d.readOnly || d.disabled;
			} else {
				doPrevent = true;
			}
			if (doPrevent) {
				// console.log('prevent');
				stopEvent(evt);
			}
		}

		function isInHtmlInput(d) {
			return (
				d.tagName.toUpperCase() === 'TEXTAREA' || d.tagName.toUpperCase() === 'SELECT' || (d.tagName.toUpperCase() === 'INPUT' && (d.type.toUpperCase() === 'TEXT' || d.type.toUpperCase() === 'PASSWORD' || d.type.toUpperCase() === 'FILE' || d.type.toUpperCase() === 'NUMBER'))
			);
		}

		function publish(eventName, evt, param, cancelStopEvent) {
			if (test) {
				console.log("keyboard " + eventName);
			}
			$.publish(eventName, [param, evt]);
			if (cancelStopEvent !== true) {
				stopEvent(evt);
			}
		}

		/**
		 * keypress event   automatically triggers AFTER keydown event (but not always more info: http://help.dottoro.com/ljlwfxum.php and http://unixpapa.com/js/key.html). 
		 * In our case it will be called just if keydown function does not find the corresponding action, as if it does, it calls our publish() function which stops the event propagation (by stopEvent())
		 * The only example when this triggers (by the moment) is in AZERTY configured keyboards on SAFARI browser (on Mac)
		 */
		$(document).keypress(function(evt){
			// sometimes key does not map to any command in our list, if so, we allow default usage, 
			// however the code that follows does not apply to other browsers than safari
			if (!isSafari){ 
				return;
			}
			var keyCode = (evt === null) ? event.keyCode : evt.keyCode;
			if (keyCode == 34){
				publish('number-key', evt, 3);
			}else if (keyCode == 39){
				publish('number-key', evt, 4);
			}			
		});

		$(document).keydown(function(evt) {

			var keyCode = (evt === null) ? event.keyCode : evt.keyCode;
			var key = String.fromCharCode(keyCode).toLowerCase();
			var ctrlMetaKey = !!(evt.metaKey || evt.ctrlKey);
			// console.log("metaKey");
			var d = evt.srcElement || evt.target;
			var ACC_KEYS = {
				"s": "#",
				"v": "b",
				"n": "n"
			};
			var inc;
			if (keyCode === 8) {
				preventBackspace(evt, d);
			}
			if (isInHtmlInput(d) && keyCode != 9) { //if it's tab, we do run the event, even if it's in an html input, as this helps in chord edition
				//do nothing
				return;
			}
			if (keyCode == 17){ //ctrl
				publish('ctrlPressed',evt);
				return;
			}
			if (!ctrlMetaKey){
				if (keyCode == 38 || keyCode == 40) { // up & down arrows
					inc = (keyCode == 38) ? 1 : -1;
					publish('updown-arrows', evt, inc);
				} else if (NoteUtils.getValidPitch(key) != -1 && !ctrlMetaKey) {
					publish('pitch-letter-key', evt, key.toUpperCase());
				} else if (ACC_KEYS.hasOwnProperty(key) && !ctrlMetaKey) {
					var acc = ACC_KEYS[key];
					// console.log(acc);
					if (evt.shiftKey) {
						publish('shift-accidental-key', evt, acc);
					} else {
						publish('accidental-key', evt, acc);
					}
				} else if (parseInt(key, null) >= 1 && parseInt(key, null) <= 9) {
					publish('number-key', evt, key);
				} else if (keyCode == 190 || keyCode == 59) {
					publish('dot-key', evt, evt.shiftKey);
					stopEvent(evt);
				} else if (keyCode == 58) {
					publish('colon-key', evt);
					stopEvent(evt);
				} else if (keyCode == 84) { // T be carefull, set key to t will be call on F5 also
					if (evt.shiftKey) {
						publish('shift-t-key', evt);
					} else {
						publish('t-key', evt);
					}
				} else if (keyCode == 82) { // R
					publish('R-key', evt);
				} else if (keyCode == 85) { // U **just to test unfolding
					publish('U-key', evt); 
				}else if (keyCode == 75) { // R
					publish('K-key', evt);
				} else if (keyCode == 46 || keyCode == 8) { //supr
					publish('supr-key', evt); // in our editor we want to replace note by silence and not delete note
				} else if (keyCode == 13) { //enter
					publish('enter-key', evt);
				} else if (keyCode == 32) {
					publish('spacebar', evt);
				} else if (keyCode == 9) {
					inc = (evt.shiftKey) ? -1 : 1;
					publish('tab-key', evt, inc);
				
				} else if (keyCode == 36) { //begin
					if (evt.shiftKey) {
						publish('shift-begin', evt);
					} else {
						publish('begin', evt);
					}
				} else if (keyCode == 35) { //end
					if (evt.shiftKey) {
						publish('shift-end', evt);
					} else {
						publish('end', evt);
					}
				} else if (keyCode == 37 || keyCode == 39) { // left-right arrows
					inc = (keyCode == 39) ? 1 : -1;
					if (evt.shiftKey) {
						publish('shift-leftright-arrows', evt, inc);
					} else {
						publish('leftright-arrows', evt, inc);
					}
				} else if (keyCode === 27) {
					publish('esc', evt);
				}

			}else{
				if (keyCode == 67) { // Ctrl + c or Command + c (mac or windows specific key)
					publish('ctrl-c-key', evt, undefined, true);
				} else if (keyCode == 86) { // Ctrl + v or Command + v (mac or windows specific key)
					publish('ctrl-v-key', evt, undefined, true);
				} else if (keyCode === 90) { // Ctrl + z
					publish('ctrl-z', evt);
				} else if (keyCode === 89) { // Ctrl + y
					publish('ctrl-y', evt);
				} else if (keyCode === 65) { // Ctrl + a
					publish('ctrl-a', evt);
				} else if (keyCode == 37 || keyCode == 39) { // left-right arrows
					inc = (keyCode == 39) ? 1 : -1;
					publish('ctrl-leftright-arrows', evt, inc);
				} 
			}
		});
		$(document).keyup(function(evt) {
			var keyCode = (evt === null) ? event.keyCode : evt.keyCode;
			if (keyCode == 17){ //ctrl
				publish('ctrlUnpressed',evt);
			}
		});
	}
	return KeyboardManager;
});