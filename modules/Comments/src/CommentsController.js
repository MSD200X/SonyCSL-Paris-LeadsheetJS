define([
	'pubsub',
	'jquery',
	'modules/Comments/src/CommentsModel',
	'modules/Comments/src/CommentsView'
], function(pubsub, $, CommentsModel, CommentsView) {
	/**
	 * Audio comments controller
	 * @exports AudioComments/CommentsController
	 */
	/**
	 * [CommentsController description]
	 * @param {Object} params
	 *        				 {
	 *        				 	userSession: userSession,
	 *        				 	viewer: {LSViewer} viewer,
	 *        				 	song: {song} song ,
	 *        				 	audio: {AudioModule} audio        
	 *        				 	noteSpaceManager: {NoteSpaceManager} noteSpaceManager
	 *        				 	notesCursor: {CursorModel} notesCursor
	 *        				 	chordsEditor: {ChordsEditor} chordsEditor
	 *        				 }
	 *        					
	 * @param {Object} serverComment, object (provided by the client) that communicates with server
	 * 
	 */
	function CommentsController(params, serverComments) {
		params = params || {};
		
		if (!params.viewer || !params.song || !params.userSession || !params.userSession.name || !params.userSession.id){
			throw "CommentsController - wrong params";
		}
		
		var audioDrawer = params.audio && params.audio.drawer ? params.audio.drawer : undefined;

		var model = new CommentsModel(serverComments);
		var view = new CommentsView(params.viewer, params.song, audioDrawer, params.noteSpaceManager, params.notesCursor, params.chordsEditor );
		var song = params.song;
		var user = params.userSession;
		var commentsShowingBubble = [];
		
		var AUDIO = !!params.audio;
		var SCORE = !!(params.notesCursor || params.chordsEditor);
		var enabled = !!params.enabled;

		if (enabled){
			initSubscribe();
		}
		
		function _handleComments(type){
			type = type || 'score';
			model.getComments(type, function(comments){
				view.draw(comments, user.id);
			});
		}

		function handleAudioComments() {
			_handleComments('audio');
		}
		
		function handleScoreComments() {
			_handleComments('score');
		}

		function hideComment(commentId) {
			view.hideBubble(commentId);
			//remove element from array
			var index = commentsShowingBubble.indexOf(commentId);
			commentsShowingBubble.splice(index, 1);
		}

		/**
		 * calls view showBubble, and saves the information needed to remember that comment is being shown
		 * @param  {String} commentId    
		 * @param  {String} orderedIndex    
		 * @param  {Integer|String} orderedIndex 
		 */
		function showComment(commentId, orderedIndex) {
			if (commentsShowingBubble.indexOf(commentId) === -1){
				commentsShowingBubble.push(commentId);	
			}
			view.showBubble(commentId);
		}

		//enables comment module
		function enable() {
			if (!enabled)
			{
				if (AUDIO){
					handleAudioComments();
					$.subscribe('AudioDrawer-audioDrawn', handleAudioComments);
				}
				if (SCORE){
					handleScoreComments();
					// TODO find a better way to redraw comments
					// $.subscribe('LSViewer-drawEnd', handleScoreComments);
				}
				enabled = !enabled;
			}
		}
		//disables comment module
		function disable(){
			if (enabled){
				if (AUDIO){
					$.unsubscribe('AudioDrawer-audioDrawn', handleAudioComments);
				}
				if (SCORE){
					$.unsubscribe('LSViewer-drawEnd', handleScoreComments);	
				}
				enabled = !enabled;
			}
		}

		
		/**
		 * this function is only used in test examples, to load comments directly (when there is no database to load comments from)
		 * @param {String} comment
		 */
		function addComment(comment) {
			model.addComment(comment);
		}

		function initSubscribe(){
			if (AUDIO) {
				$.subscribe('AudioDrawer-audioDrawn', handleAudioComments);
			}
			//ScoreComments
			if (SCORE){
				// TODO find a better way to redraw comments
				// $.subscribe('LSViewer-drawEnd', handleScoreComments);
			}
			//comments are activated by K-key
			$.subscribe('K-key', function(el){
				if (enabled){
					view.showNewComment();	
				}
			});
			$.subscribe('createComment', function(el){
				view.showNewComment();
			})

			$.subscribe('MainMenuModel-setCurrentMenu', function(el, obj){
				if (obj.title === 'Annotation'){
					enable();
				}else{
					disable();
				}
				$.publish('ToViewer-draw', song);
			});

			// showing audio comment could be directly done on audio selection 
			// (BUT there is an issue, audioCursor is 'disabled', as we have not released the mouse button yet in this moment ). So we comment it, and use a keyboard event to show comment
			// 
			// $.subscribe('AudioCursor-selectedAudio', function(el, startCursor, endCursor) {
			// 	self.view.showNewComment();
			// });
			$.subscribe('CommentSpaceManager-clickedComment', function(el, commentId) {
				//If shown, hide. If hidden, show
				if (commentsShowingBubble.indexOf(commentId) === -1) {
					showComment(commentId/*, orderedIndex*/);
				} else {
					hideComment(commentId);
				}
			});
			$.subscribe('CommentsView-closeBubble', function(el, commentId) {
				hideComment(commentId);
			});

			$.subscribe('CommentsView-saveComment', function(el, comment) {
				comment.userId = user.id;
				comment.userName = user.name;
				comment.type = view.newComment.type;
				
				model.saveComment(comment, function(commentId) {
					$.publish('ToViewer-draw', song); 
					//we show comment bubble after waiting 200 ms, time enough to let 'toViewer-draw' finish drawing all comments, otherwise it would give an error
					setTimeout(function() {
						showComment(commentId);
					}, 200);
				});
			});
			$.subscribe('CommentsView-updateComment', function(el, commentId, text) {
				model.updateComment(commentId, text, function() {
					view.updateComment(commentId, text);
					showComment(commentId);
				});
			});
			
			$.subscribe('CommentsView-editingComment', function(el, bubbleEl, commentId) {
				var comment = model.getComment(commentId);
				view.showEditingComment(bubbleEl, comment.text, commentId, hideComment);
			});
			$.subscribe('CommentsView-removingComment', function(el, bubbleEl, commentId) {
				bubbleEl.remove();
				model.removeComment(commentId, function() {
					$.publish('ToViewer-draw', song);
				});
			});
		}
		return {
			addComment: addComment
		};
	}
	return CommentsController;
});