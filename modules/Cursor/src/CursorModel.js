define([
	'jquery',
	'pubsub',
], function($, pubsub) {

	/**
	 * Cursor consists of a pos array that contains index start and index end of position
	 * @exports Cursor/CursorModel
	 * @param {Int|Array|Object} listElements allows to get size of a list, must be an int, or an array, or an object, if it's an object then getTotal function will be called to get list length
	 * @param {Array} optCursor gets a cursor as an array of two positions [start,end]
	 */
	function CursorModel(listElements, id, optCursor, isEditable) {
		this.listElements = listElements;
		optCursor = optCursor || [0, 0];
		if (!(optCursor instanceof Array)) optCursor = [optCursor, optCursor];

		this.sideSelected = 1;
		this.id = (typeof id !== "undefined") ? id : '';
		this.isEditable = (typeof isEditable !== "undefined") ? isEditable : true;
		this.setPos(optCursor);
		// this.color = color || "#0099FF";
	}


	CursorModel.prototype.getPos = function() {
		return this.pos;
	};

	/**
	 * @param {Array} gives the position of the note of the cursor pos can be an array [start,end]
	 * or a single value that will be converted to an array [value, value]
	 */
	CursorModel.prototype.setPos = function(pos) {
		if (!(pos instanceof Array)) pos = [pos, pos];
		if (isNaN(pos[0])){
			return;  //in the case we are setting position from audio playing, we check the cursor really exists, if not we do not optate	
		}
		pos = this._checkPosition(pos);
		this.pos = pos;
		$.publish('CursorModel-setPos', [this.pos, this.id]);
	};

	CursorModel.prototype.getStart = function() {
		return this.pos[0];
	};

	CursorModel.prototype.getEnd = function() {
		return this.pos[1];
	};

	/**
	 * Set only one element of the position eg setIndexPos(0, 3), setIndexPos(1, 4)
	 * @param {int} index must be 0 or 1, 0 mean you want to change start, 1 mean you want to change end
	 * @param {int} pos   cursor position
	 */
	CursorModel.prototype.setIndexPos = function(index, pos) {
		if ((index !== 0 && index !== 1) || isNaN(pos)) {
			throw 'CursorModel - setIndexPos, arguments not well defined ' + 'index:' + index + ' - pos:' + pos;
		}
		pos = this._checkPosition(pos)[0];
		this.pos[index] = pos;
		$.publish('CursorModel-setPos', [this.pos, this.id]);
	};

	/**
	 * This function checks that a position is valid, it means that it's between 0 and listLength
	 * @param  {Int|Array} position can be a int or an array of two Int
	 * @return {Array}     A new position array clamped
	 */
	CursorModel.prototype._checkPosition = function(position) {
		function isFloat(n) {
			return n === Number(n) && n % 1 !== 0;
		}
		if (!(position instanceof Array)) position = [position, position];
		var numElems = this.getListLength();
		for (var i = 0; i < position.length; i++) {
			if (position[i] < 0) position[i] = 0;
			if (position[i] >= numElems) {
				position[i] = isFloat(numElems) ? numElems - 0.01 : numElems - 1;
			}
		}
		return position;
	};

	/**
	 * normally after deleting, if cursor points to an unexisting note, it moves to the last one existing
	 */
	CursorModel.prototype.revisePos = function() {
		for (var i in this.pos) {
			if (this.pos[i] >= this.getListLength()) this.setIndexPos(i, this.getListLength() - 1);
		}
	};

	CursorModel.prototype.selectAll = function() {
		this.setPos([0, this.getListLength() - 1]);
	};
	/**
	 * expands (= moves just one side of the cursor)
	 * @param  {int} inc      -1 or 1, expand to left or right
	 */
	CursorModel.prototype.expand = function(inc) {
		if (this.pos[1] === this.pos[0]) {
			this.sideSelected = (inc > 0) ? 1 : 0;
		}
		var newPos = this.pos[this.sideSelected] + inc;
		if (newPos < 0) {
			newPos = 0;
		}
		if (newPos >= this.getListLength()) {
			newPos = this.getListLength() - 1;
		}
		this.setIndexPos(this.sideSelected, newPos);
	};

	/*	CursorModel.prototype.getRelativeCursor = function(index) {
			var newSelected = [this.pos[0] - index, this.pos[1] - index];
			return new CursorModel(newSelected);
		};*/

	CursorModel.prototype.reset = function() {
		this.setPos([0, 0]);
	};

	CursorModel.prototype.increment = function(inc) {
		inc = inc || 1;
		this.setIndexPos(0, this.pos[0] += inc);
		this.setIndexPos(1, this.pos[1] += inc);
	};

	CursorModel.prototype.setListElements = function(listElements) {
		this.listElements = listElements;
	};

	CursorModel.prototype.getListLength = function() {
		if (typeof this.listElements === 'object') {
			return this.listElements.getTotal();
		}
		if (this.listElements.constructor === Array) {
			return this.listElements.length;
		}
		if (this.listElements.constructor === Number) {
			return this.listElements;
		}
	};

	CursorModel.prototype.setEditable = function(isEditable) {
		if (!isEditable){
			this.setPos(null);
		}
		this.isEditable = !!isEditable;
	};

	CursorModel.prototype.getEditable = function() {
		return this.isEditable;
	};

	return CursorModel;
});