define(function() {
	/**
	 * maps notes between folded and unfolded versions of the song
	 * each position corresponds to a note in unfolded song, value corresponds to folded song
	 */
	var NotesMapper = function() {
		this.noteIndexes = [];
	};
	NotesMapper.prototype._getLastIndexes = function() {
		return this.noteIndexes.length !== 0 ? this.noteIndexes[this.noteIndexes.length - 1] : false;
	};
	NotesMapper.prototype.addIndexes = function(indexes) {
		for (var i = indexes[0]; i < indexes[1]; i++) {
			this.noteIndexes.push(i);
		}
	};
	/**
	 * @param  {Number} unfoldedIdx 
	 * @return {Number}             
	 */
	NotesMapper.prototype.getFoldedIdx = function(unfoldedIdx) {
		var newIdxPos;
		if (Array.isArray(unfoldedIdx)) {
			newIdxPos = [];
			for (var i = 0; i < unfoldedIdx.length; i++) {
				newIdxPos.push(this.noteIndexes[unfoldedIdx[i]]);
			}
		}
		else{
			newIdxPos = this.noteIndexes[unfoldedIdx];
		}
		return newIdxPos;
	};
	/**
	 * If we have folded Idx, it can map to several unfolded Idxes, we get the first one (this is used when playing, to get the cursor position which will be start position)
	 * @param  {Number} foldedIdx 
	 * @return {Number}           
	 */
	NotesMapper.prototype.getFirstUnfoldedIdx = function(foldedIdx) {
		for (var i = 0; i < this.noteIndexes.length; i++) {	
			if (this.noteIndexes[i] === foldedIdx) {
				return i;
			}
		}
		return -1;
	};
	return NotesMapper;
});