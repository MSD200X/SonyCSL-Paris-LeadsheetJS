/**
 * CanvasLayer is a canvas place on top of the basic canvas to manage edition and to draw elements such as cursors (to optimize rendering)
 * @param {LSViewer} viewer
 */
define(['jquery', 'pubsub'], function($, pubsub) {
	
	/**
    * Canvas layer module manages fast drawn interaction, 
    * it creates an hover canvas that is fast and repetively drawn, it's usefull to draw cursor or selection for eg
    * @exports LSViewer/CanvasLayer
    */
	function CanvasLayer(viewer, detectEventOnAllDocument, interactiveCanvasLayer) {
		if (!viewer.canvas) {
			throw "LSViewer cannot create layer because canvas does not exist";
		}

		this.viewer = viewer;
		var canvasLayer = this._createLayer(viewer);
		this.canvasLayer = canvasLayer[0];
		this.ctx = canvasLayer[0].getContext('2d');
		this.color = "rgba(0,0,255,1)";
		this.mouseCoordsIni = null;
		this.mouseCoordsEnd = null;
		this.coords = {};
		this.mouseDown = false;
		this.detectEventOnAllDocument = (detectEventOnAllDocument !== undefined) ? detectEventOnAllDocument : false;
		if (interactiveCanvasLayer) this._listenEvents(canvasLayer);
		this.elems = {}; //elements to be added (can be CLICKABLE or CURSOR)
		this.order = []; //we keep trace of order in which elements are added, to decide which should be prioritized on click
		this.ctrlPressed = false;
	}

	CanvasLayer.prototype._createLayer = function(viewer) {
		var canvasEl = $(viewer.canvas),
			idCanvas = canvasEl.attr('id'),
			idLayer = idCanvas + "-layer",
			offset = canvasEl.offset(),
			//top depends on the position (absolute, static..) of the canvas container element
			top = (canvasEl.parent().css("position") == "absolute") ? 0 : offset.top;

		var canvasLayer;
		//we remove it, to create a new one (_createLayer it's called only at the beginning or when resizing)
		if ($("canvas#" + idLayer).length !== 0) {
			$("canvas#" + idLayer).remove();
		}
		$("<canvas id='" + idLayer + "' width='" + canvasEl.width() + "' height='" + canvasEl.height() + "'></canvas>").insertAfter(canvasEl);
		canvasLayer = $("#" + idLayer);
		canvasLayer.css('z-index', 10);
		return canvasLayer;
	};

	CanvasLayer.prototype._getXandY = function(element, event) {
		return {
			x: event.pageX - element.offset().left,
			y: event.pageY - element.offset().top
		};
	};

	/**
	 * Element should have properties:
	 *		CL_NAME 
	 *		CL_TYPE
	 *	methods:
	 *		getType
	 *		iEnabled
	 *		enable   
	 *		disable
	 *		onSelected
	 *		inPath
	 *
	 * CLICKABLE elements will be enabled always, but 'disable' function is useful for example to simulate event 'onBlur' when unfocusing element
	 * 
	 * CL_TYPE can be 'CURSOR' or 'CLICKABLE' or 'NOT_INTERACTIVE'
	 * if it's CURSOR, it needs to have also this methods:
	 *		getYs
	 *		name
	 *		drawCursor
	 *		setCursorEditable
	 */
	CanvasLayer.prototype.addElement = function(elem, priority) {
		if (!elem || !elem.CL_NAME || !elem.getType()) {
			throw 'CanvasLayer element needs CL_NAME and CL_TYPE property';
		}
		var self = this;
		
		function addOrderedElemName(elemName, priority){
			if (priority){
				self.order.unshift(elemName); //we put it in the first position
			}else{
				self.order.push(elemName);
			}
		}
		// if it's new, we save its order
		if (!(elem.CL_NAME in this.elems)) {
			addOrderedElemName(elem.CL_NAME, priority);
			//order is useful to control z-index of drawn elements, last drawn elements will be prioritized on click. (see getOneActiveElement())
		}
		//this will update it if not new, and will create the value in the object if it is new. We were having problems when entering it only when it was not new, because
		//audioComments where not updated
		this.elems[elem.CL_NAME] = elem;

	};

	CanvasLayer.prototype._listenEvents = function() {
		var self = this,
			xy,
			coords;
		this.mouseDown = false;
		/**
		 * when selecting we need to know which kind of elements (being normally notes, chords or audio), are at the top and at the bottom of the selection.
		 * We will decide by that, which elements will be editable. So far, we take maximum two.
		 * E.g.1 if notes at top and notes at bottom of selection, we only enable edition for notes (even if there are chords in the middle)
		 * E.g.2 if notes at top and chords at bottom of selection, we enable edition on notes and chords at the same time.
		 * @param  {Object} coords e.g.:  {x:12, y:21}
		 *
		 * @return {Array}        array of active elements (being elements like ChordSpaceManager, NoteSpaceManager, WaveDrawer. TextElementManager will never be returned because it is not selectable (it does not have getY() function), it is only thought for being clicked)
		 */
		function getElemsByYs(coords) {
			var minY = 999999,
				maxY = 0,
				minName, maxName, ys;
			var activeElems = [];
			for (var name in self.elems) {
				if (self.elems[name].getType() === 'CURSOR') {
					ys = self.elems[name].getYs(coords);
					if (ys.topY < minY) {
						minY = ys.topY;
						minName = name;
					}
					if (ys.bottomY > maxY) {
						maxY = ys.bottomY;
						maxName = name;
					}
				}
			}
			if (minName) {
				activeElems.push(self.elems[minName]);
			}
			if (maxName && minName != maxName) {
				activeElems.push(self.elems[maxName]);
			}
			return activeElems;
		}
		/**
		 * when clicking on an element we will select one only element, this function chooses which one depending on coords
		 * @param  {Object} coords  e.g.:  {x:12, y:21}
		 * @return {Object}        class of active element (ChordSpaceManager, NoteSpaceManager, WaveDrawer. TextElementManager...etc.)
		 */
		function getOneActiveElement(coords) {
			
			var name, elem;
			
			for (var i = 0; i < self.order.length; i++) {
				name = self.order[i];
				elem = self.elems[name]; 
				if (elem.getType() !== 'NOT_INTERACTIVE' && elem.inPath(coords)) {
					return [elem];
				}
			}
		}

		function resetElems() {
			for (var name in self.elems) {
				if (self.elems[name].getType() == 'CURSOR') {
					self.elems[name].setCursorEditable(false);
				}
				self.elems[name].disable();
			}
		}

		/**
		 * [selection description]
		 * @param  {Boolean} clicked true when clicked (mouseDown and mouseUp in same position) false when moved mouse onMouseDown
		 */
		function selection(clicked, mouseUp) {
			var cursorPos;
			if (!self.ctrlPressed){
				resetElems();
			}
			var activElems;
			if (clicked) {
				activElems = getOneActiveElement(self.coords);
			} else {
				activElems = getElemsByYs(self.coords);
			}
			for (var i in activElems) {
				if (activElems[i].getType() == 'CURSOR') {
					activElems[i].setCursorEditable(true);		
				}		
				activElems[i].enable();
				activElems[i].onSelected(self.coords, self.mouseCoordsIni, self.mouseCoordsEnd, clicked, mouseUp, self.ctrlPressed);
			}
			self.refresh();
		}

		/**
		 * cursor set to pointer to indicate when an element is clickable. Before it was managed by each element edition class (notes,chords...etc.) but we moved it here
		 * because it has to be centralized otherwise events were interfering to each other (notes pointer when mouse is over notes would not work if at the same time chords editor asks to set pointer to default when mouse is not over chords)
		 * @param {Object} xy  e.g.:  {x:12, y:21}
		 */
		function setPointerIfInPath(xy) {
			if (typeof self.viewer.divContainer.style !== 'undefined') {
				var found = false;
				for (var name in self.elems) {
					if (typeof self.elems[name].inPath !== 'function') {
						continue;
					}
					if (self.elems[name].inPath(xy)) {
						self.viewer.divContainer.style.cursor = 'pointer';
						found = true;
					}
				}
				if (!found) {
					self.viewer.divContainer.style.cursor = 'default';
				}
			}
		}

		if (this.detectEventOnAllDocument) {
			$('html').on('mousedown', function(evt) {
				mouseDown(evt);
				//evt.stopImmediatePropagation();
			});
			// Mouseup on canvas is usefull to allow unselect
			$('html').on('mouseup',function(evt) {
				mouseUp(evt);
				//evt.stopImmediatePropagation();
			});
		} else {
			$(this.canvasLayer).mousedown(function(evt) {
				mouseDown(evt);
			});
			// Mouseup on canvas is usefull to allow unselect
			$(this.canvasLayer).mouseup(function(evt) {
				mouseUp(evt);
			});
		}

		function mouseDown(evt) {
			var d = evt.srcElement || evt.target;
			if (d.tagName.toUpperCase() === 'TEXTAREA' || d.tagName.toUpperCase() === 'INPUT' || d.tagName.toUpperCase() === 'SELECT' || d.tagName.toUpperCase() === 'OPTION') {
				return;
			}
			coords = self._getXandY($(self.canvasLayer), evt);
			self.mouseCoordsIni = [coords.x, coords.y];
			self._setCoords(self.mouseCoordsIni, self.mouseCoordsIni);
			self.mouseDown = true;
		}

		function mouseUp(evt) {
			self.mouseDown = false;
			var isClick = self.mouseDidntMove();
			if (isClick && evt.button == 2) {
				// $.publish('right-click');
			} else {
				if (isTargetValid(evt)) {
					selection(isClick, true);
				}
			}
		}
		// check if we click on something that is canvas or that contain canvas to prevent click on something that is above a player or menu etc
		function isTargetValid(evt) {
			if (evt.target.id === $(self.canvasLayer).attr('id') || $(evt.target).find($(self.canvasLayer)).length > 0) {
				return true;
			}
			return false;
		}

		$('html').on('mousemove',function(evt) {
			//draw cursor selection
			var xy = self._getXandY($(self.canvasLayer), evt);
			if (self.mouseDown) {
				var ctx = self.ctx;
				self.mouseCoordsEnd = [xy.x, xy.y];
				self._setCoords(self.mouseCoordsIni, self.mouseCoordsEnd);
				self._clampCoords($(self.canvasLayer));
				if (isTargetValid(evt)) {
					selection();
				}
			}
			setPointerIfInPath(xy);

		});
		$.subscribe('ctrlPressed', function(){
			self.ctrlPressed = true;
		});
		$.subscribe('ctrlUnpressed', function(){
			self.ctrlPressed = false;
		});
		$.subscribe('CanvasLayer-refresh', function() {
			self.refresh();
		});	
	};

	/**
	 * true if position on mouseDown is the same (or almost) as position on mouseUp
	 * @return {Booelan}
	 */
	CanvasLayer.prototype.mouseDidntMove = function() {
		return (Math.abs(this.coords.x - this.coords.xe) < 5 && Math.abs(this.coords.y - this.coords.ye) < 5);
	};

	CanvasLayer.prototype._clampCoords = function(element) {
		xeElement = element.width();
		yeElement = element.height();
		if (this.coords.x < 0) {
			this.coords.x = 1;
		}
		if (this.coords.y < 0) {
			this.coords.y = 1;
		}
		if (this.coords.xe > xeElement) {
			this.coords.xe = Math.floor(xeElement) - 1;
		}
		if (this.coords.ye > yeElement) {
			this.coords.ye = Math.floor(yeElement) - 1;
		}
	};

	CanvasLayer.prototype._setCoords = function(mouseCoordsIni, mouseCoordsEnd) {

		function get(xory, type) {
			var evaluation;
			var num = (xory == "x") ? 0 : 1;
			if (type == "smaller") evaluation = (mouseCoordsIni[num] < mouseCoordsEnd[num]);
			else if (type == "greater") evaluation = (mouseCoordsIni[num] > mouseCoordsEnd[num]);
			return evaluation ? mouseCoordsIni[num] : mouseCoordsEnd[num];
		}
		this.coords.x = get("x", "smaller");	
		this.coords.y = get("y", "smaller");
		this.coords.xe = get("x", "greater");
		this.coords.ye = get("y", "greater");

	};

	CanvasLayer.prototype.getCanvas = function() {
		return this.canvasLayer;
	};

	/**
	 * Refresh canvas layer: all elements in canvas layer should be elements cursors or elements that change fast
	 */
	CanvasLayer.prototype.refresh = function() {
		//console.log('refresh');
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		this.viewer.scale(this.ctx);
		// console.log(name1+","+name2);
		// console.log(this.elems);
		var elem;
		for (var name in this.elems) {
			elem = this.elems[name];
			if (elem.isEnabled() && (elem.getType() === 'CURSOR' || elem.getType() === 'NOT_INTERACTIVE')) {
				//drawing cursor for notesManager, chordsManager and AudioCursor (selection cursor)
				elem.drawCursor(this.ctx);
			}
			//TODO refactor, drawCursor only exists in AudioCursor to draw playing cursor
			if (typeof elem.drawPlayingCursor === 'function') {
				elem.drawPlayingCursor(this.ctx);
			}
		}
		this.viewer.resetScale(this.ctx);
		if (this.mouseDown) {
			var style = this.ctx.strokeStyle;
			this.ctx.strokeStyle = this.color;
			this.ctx.strokeRect(
				this.coords.x,
				this.coords.y,
				this.coords.xe - this.coords.x,
				this.coords.ye - this.coords.y
			);
			this.ctx.strokeStyle = style;
		}

	};
	CanvasLayer.prototype.destroy = function() {
		$('html').off('mousedown');
		$('html').off('mouseup');
		$('html').off('mousemove');
		$.unsubscribe('ctrlPressed');
		$.unsubscribe('ctrlUnpressed');
		$.unsubscribe('CanvasLayer-refresh');
	};
	return CanvasLayer;
});