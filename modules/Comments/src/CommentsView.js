define([
	'mustache',
	'jquery',
	'modules/Comments/src/CommentSpaceManager',
	'modules/Comments/src/AudioCommentsView',
	'modules/Comments/src/NoteCommentsView',
	'modules/Comments/src/ChordCommentsView',
	'text!modules/Comments/src/SpeechBubbleTpl.html',
	'text!modules/Comments/src/NewCommentTpl.html',

], function(Mustache, $, CommentSpaceManager, AudioCommentsView, NoteCommentsView, ChordCommentsView, SpeechBubbleTpl, NewCommentTpl) {
	/**
	 * 
	 * @exports AudioComments/CommentsView
	 */
	function CommentsView(viewer, song, audioCursor, noteSpaceMng, notesCursor, chordsEditor) {
		this.viewer = viewer;
		this.COLOR = "#FFBF00";
		this.initController();
		this.newComment = {};
		this.offset = $("#" + viewer.canvasId).offset();
		this.newCommentId = "newComment";
		this.bubblePreId = "bubble"; //prefix Id, the comments of bubbles' id will be, bubble0, bubble1...etc.
		this.commentSpaceMng = new CommentSpaceManager(this.viewer);
		this.viewTypes = {};
		if (audioCursor){
			this.viewTypes['audio'] = AudioCommentsView(audioCursor);
		}
		if (noteSpaceMng){
			this.viewTypes['notes'] = NoteCommentsView(noteSpaceMng, notesCursor, song);
		}
		if (chordsEditor){
			this.viewTypes['chords'] = ChordCommentsView(chordsEditor, song);	
		}
		this.noteSpaceMng = noteSpaceMng;
		this.notesCursor = notesCursor;
		this.song = song;
	}

	/**
	 * jquery events
	 */
	CommentsView.prototype.initController = function() {
		var self = this;
		//close comment
		$(document).on('click', '.closeComment', function(e) {
			e.preventDefault();
			var id = $(this).closest('.speech-bubble').attr('id');
			if (id == self.newCommentId) {
				self.hideNewComment();
			} else {
				id = id.substr(self.bubblePreId.length, id.length); //extracting prefix "bubble", to get id X on "bubbleX"
				$.publish('CommentsView-closeBubble', id);
			}
		});
		//new comment
		$(document).on('click', '#sendNewComment', function(e) {
			e.preventDefault();
			var commentEl = $(this).closest('.speech-bubble');
			var text = commentEl.find('textarea').val();
			var commentId = commentEl.find('input[name="commentId"]').val();

			if (commentId.length !== 0) {
				$.publish('CommentsView-updateComment', [commentId, text]);
			} else {
				self.newComment.text = text;
				$.publish('CommentsView-saveComment', self.newComment);
			}
			self.hideNewComment();
		});

		//edit comment
		$(document).on('click', '.edit-comment', function(e) {
			e.preventDefault();
			var commentEl = $(this).closest('.speech-bubble'),
				commentId = commentEl.attr('data-commentId');
			$.publish('CommentsView-editingComment', [commentEl, commentId]);
		});

		//remove comment
		$(document).on('click', '.remove-comment', function(e) {
			e.preventDefault();
			var commentEl = $(this).closest('.speech-bubble'),
				commentId = commentEl.attr('data-commentId');
			$.publish('CommentsView-removingComment', [commentEl, commentId]);
		});
		self.drawNewComment();
	};

	CommentsView.prototype._htmlIdExists = function(id) {
		return $("#" + id).length !== 0;
	};

	/**
	 * called by AudioCommentsController
	 * draws comment marker (with the picture and the name)
	 * @param  {CommentsModel} CommentsModel
	 * @param  {WaveDrawer} waveDrawer
	 */
	CommentsView.prototype.draw = function(comments, userId) {
		//we need to add element to canvas each time we draw
		this.viewer.canvasLayer.addElement(this.commentSpaceMng, true);
		
		//we construct it here because it adds himself to canvasLayer which exists only after the score is drawn
		var ctx = this.viewer.ctx,
			self = this;

		this.drawNewComment();

		//draw using drawElem to respect scaling
		this.viewer.drawElem(function() {
			var bubbleId;
			for (var i in comments) {
				self.drawComment(comments[i], ctx);
				bubbleId = self.bubblePreId + comments[i].id;
				if (!self._htmlIdExists(bubbleId)) {
					self.drawBubble(comments[i], bubbleId, userId);
				}
			}
		});
	};

	CommentsView.prototype.drawComment = function(comment, ctx) {
		var saveFillColor = ctx.fillStyle;
		var clickableArea;
		var color = this.viewTypes[comment.type].color || this.COLOR;
		ctx.fillStyle = color;
		ctx.strokeStyle = color;
		var areas = this.viewTypes[comment.type].getArea(comment);
		
		ctx.beginPath();
		ctx.lineWidth = 5;
		paddingY = 5; // could be part of each viewType
		for (var i = 0; i < areas.length; i++) {
			areas[i].y -= paddingY;
		}
		//draw border top of comment marker
		for (i = 0, c = areas.length; i < c; i++) {
			ctx.moveTo(areas[i].x, areas[i].y );
			ctx.lineTo(areas[i].x + areas[i].w, areas[i].y);
		}
		ctx.stroke();
		
		ctx.lineWidth = 1;
		//draw border left, to indicate time start of audio comment
		ctx.moveTo(areas[0].x, areas[0].y);
		ctx.lineTo(areas[0].x, areas[0].y + areas[0].h + paddingY);

		//draw border right, to indicate time end of audio comment
		var lastArea = areas.length - 1;
		ctx.moveTo(areas[lastArea].x + areas[lastArea].w - 1, areas[lastArea].y);
		ctx.lineTo(areas[lastArea].x + areas[lastArea].w - 1, areas[lastArea].y + areas[0].h);
		ctx.closePath();
		ctx.stroke();

		ctx.font = "12px Arial";
		var text = ctx.measureText(comment.userName);
		var widthBox = 100;
		if (text.width > widthBox) {
			widthBox = text.width + 50; // 50 stand for 30px image width + padding/margin
		}
		
		//draw little box with picture and name, which will be clickable
		clickableArea = {
			x: areas[0].x,
			y: areas[0].y - 30,
			w: widthBox,
			h: 30
		};

		ctx.strokeRect(clickableArea.x, clickableArea.y, clickableArea.w, clickableArea.h);
		ctx.globalAlpha = 0.7;
		ctx.fillRect(clickableArea.x, clickableArea.y, clickableArea.w, clickableArea.h);
		ctx.globalAlpha = 1;
		var img = new Image();
		img.onload = function() {
			ctx.drawImage(img, areas[0].x, areas[0].y - 30, 30, 30);
		};
		ctx.fillStyle = "#000";
		ctx.textBaseline = 'bottom';
		img.src = comment.img;

		ctx.fillText(comment.userName, areas[0].x + 38, areas[0].y - 15);

		if (comment.date !== undefined) {
			ctx.font = "10px Arial";
			ctx.fillText("(" + comment.date + ")", areas[0].x + 35, areas[0].y - 2);
		}
		
		ctx.fillStyle = saveFillColor;
		//add clickable area to commentSpaceMgn
		this.commentSpaceMng.addCommentSpace(comment.id, clickableArea);
	};

	/**
	 * Bubble is a HTML div, it is drawn as a hidden element after every LSViewer draw
	 * @param  {Object} comment
	 * @param  {String} bubbleId
	 * @param  {String} userId
	 */
	CommentsView.prototype.drawBubble = function(comment, bubbleId, userId) {
		var el = Mustache.render(SpeechBubbleTpl, {
			textComment: comment.text,
			ownComment: comment.userId == userId
		});
		// divContainer should have position relative, absolut or fixed (so that appended elements' position depend on it)
		$(this.viewer.divContainer).append(
			$(el).attr('id', bubbleId)
			.attr('data-commentId', comment.id)
			.hide()
		);
	};

	/**
	 * NewComment represents the editable bubble with empty textare, drawn here as hidden
	 */
	CommentsView.prototype.drawNewComment = function() {
		//draw only if doesn't exists, to avoid duplicates 
		//(html elements are different from canvas elements, html elements are not reseted in every LSViewer draw whereas canvas elements are)
		if (!this._htmlIdExists(this.newCommentId)) {
			var el = Mustache.render(NewCommentTpl);
			// divContainer should have position relative, absolut or fixed (so that appended elements' position depend on it)
			$(this.viewer.divContainer).append($(el).hide()); 
		}
	};

	/**
	 * show bubble is called when clicking on box with picture and name
	 * @param  {String} commentId  Id of the comment, coincides with the key of the comments object in the model
	 *                           e.g. if we have removed comment with id 2, keys of comments is ["0","1","3","4"] whereas corresponding indexes will be [0,1,2,3], so when *                           commentId is 2, index will be 3 (works well as every time a comment is added or deleted, everything is recalculated)
	 */
	CommentsView.prototype.showBubble = function(commentId) {
		
		//var height = $("#" + this.bubblePreId + commentId).height();
		var height = 100;
		if (!this.commentSpaceMng.commentSpaces[commentId]) {
			this.drawComment(this.viewer.ctx);
			throw "Comment space was not found for id " + commentId;
		}
		var area = this.commentSpaceMng.commentSpaces[commentId].getArea();
		$("#" + this.bubblePreId + commentId).css({
			top: area.y - height - 5,
			left: area.x,
			height: 100,
			zIndex: 1900
		}).show();
		$("#bubble" + commentId + " .textComment");
	};
 
	/**
	 * When click on 'edit' in a comment, what we do is hide the actual comment and show 'new comment' bubble with the text of the current comment
	 * @param  {Object}		bubbleEl    jquery Element
	 * @param  {String}				commentText text of current comment
	 * @param  {String}				commentId   
	 */
	CommentsView.prototype.showEditingComment = function(bubbleEl, commentText, commentId, hideCommentFn) {
		function getOldCommentPosition(bubbleEl, newCommentId) {
			var offset = $(bubbleEl).offset();
			var oldCommentHeight = $(bubbleEl).outerHeight(true);
			var newCommentHeight = $("#" + newCommentId).outerHeight(true);
			return {
				x: offset.left,
				y: offset.top + oldCommentHeight - newCommentHeight
			};
		}
		//need to get point before hiding comment
		var point = getOldCommentPosition(bubbleEl, this.newCommentId);
		hideCommentFn(bubbleEl.attr('id')); //TODO: hideComment and showComment methods should be in view
		// controller calls this.hideBubble();

		var newCommentEl = $("#" + this.newCommentId);

		newCommentEl.find('textarea').val(commentText);
		newCommentEl.find('input[name="commentId"]').val(commentId);
		newCommentEl.css({
			position: "absolute",
			top: point.y,
			left: point.x,
			zIndex: 1900
		}).show();
		$("#" + this.newCommentId+" textarea").focus();
	};

	/**
	 * when select audio region we show 'new commment' bubble
	 * @param  {Array} cursorPos  [startTime, endTime]
	 * @param  {AudioCursor} audioCursor : to find area from cursorPos
	 */
	CommentsView.prototype.showNewComment = function() {

		var audioEnabled = this.viewTypes['audio'] && this.viewTypes['audio'].isEnabled();
		var notesEnabled = this.viewTypes['notes'] && this.viewTypes['notes'].isEnabled();
		var chordsEnabled = this.viewTypes['chords'] &&  this.viewTypes['chords'].isEnabled();

		var type = audioEnabled ? 'audio' : notesEnabled ? 'notes' : chordsEnabled ? 'chords' : null;
		if (!type){
			$.publish('commentZoneNotSelected');
			console.warn("either no area selected, element editing is not passed properly to commments constructor");
			return;
		}

		var areas = this.viewTypes[type].getArea()
		this.newComment.interval = (type === 'audio') ? this.viewTypes[type].getTimeInterval() : this.viewTypes[type].getBeatInterval();
		this.newComment.type = type;
		height = $("#" + this.newCommentId).outerHeight(true);
		$("#" + this.newCommentId).css({
			position: "absolute",
			top: areas[0].y - height - 5,
			left: areas[0].x,
			zIndex: 1900
		}).show();
		$("#" + this.newCommentId+" textarea").focus();
	};

	/**
	 * Update html text (updating model has been done from the controller)
	 * @param  {String} id    id of the comment
	 * @param  {String} text 
	 */
	CommentsView.prototype.updateComment = function(id, text) {
		$("#" + this.bubblePreId + id + " .textComment").html(text);
	};
	/**
	 * @param  {String} bubbleId html id of bubble. 
	 * Normally a bubble id "bubbleX" starts always with prefix "bubble", but we can call this function with the prefix (ex. "bubble0abc") or the id directly (ex. "0abc")
	 * If there is no prefix, we add it
	 */
	CommentsView.prototype.hideBubble = function(bubbleId) {
		if (bubbleId.indexOf(this.bubblePreId) == -1) {
			bubbleId = this.bubblePreId + bubbleId;
		}
		$("#" + bubbleId).hide();
	};
	/**
	 * hides the 'new comment' bubble
	 */
	CommentsView.prototype.hideNewComment = function() {
		this.newComment = {};
		var newCommentEl = $("#" + this.newCommentId);
		newCommentEl.find('input[name="commentId"]').val("");
		newCommentEl.find('textarea').val("");
		newCommentEl.hide();
	};
	return CommentsView;
});