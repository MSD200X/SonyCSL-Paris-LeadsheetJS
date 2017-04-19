define(['jquery'], function($) {
	var UserLog = {
		defaultSpeed: 5000,
		defaultElement: $('body')[0],
		logPrefix: 'logId',
		mapTypeClass: {
			info: 'alert alert-info',
			success: 'alert alert-success',
			warn: 'alert alert-warning',
			error: 'alert alert-danger'
		},
		closeBtn: '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>',
		defaultStyle: 'position:fixed; z-index:9999; width:100%;left:0;text-align:center;font-weight:bold;',
		
		/**
		 * Call log function to send a message to user, message will automatically fadeOut quickly
		 * @param  {string} type         Define the type of message you are sending: 'info', 'success', 'warn' or 'error' (by default it's set to info)
		 * @param  {string} title        Title is the text that will be displayed to the user, it can contain variables
		 * @param  {HTMLElement} element HTMLElement where the span message will be inserted (it's inserted before this element) (by default it's on body)
		 */
		logAutoFade: function(type, title, element, speed){
			if (!type || !title){
				throw "UserLog wrong parameters";
			}
			element = element || this.defaultElement;
			speed = speed || this.defaultSpeed;
			className = this.mapTypeClass[type];
			var saveMsg = "<span class='" + className + " alert-dismissible' style='" + this.defaultStyle + "'>" + title + this.closeBtn + "</span>";
			$(saveMsg).insertBefore(element).delay(speed).queue(function() { $(this).remove(); });
		},
		/**
		 * Call log function to send a message to user, message will not be hidden unless you call remove
		 * @param  {string} type         Define the type of message you are sending: 'info', 'success', 'warn' or 'error' (by default it's set to info)
		 * @param  {string} title        Title is the text that will be displayed to the user, it can contain variables
		 * @param  {HTMLElement} element HTMLElement where the span message will be inserted (it's inserted before this element) (by default it's on body)
		 * @return {string} Return the logList id of the newly created dom element
		 */
		log: function(type, title, element){
			if (!type || !title){
				throw "UserLog wrong parameters";
			}
			element = element || this.defaultElement;
			className = this.mapTypeClass[type];
			var id = Math.round((Math.random() * 1000)) + '-' + Date.now();
			var saveMsg = "<span class='" + className + " alert-dismissible' id='"+ this.logPrefix +"-" + id + "' style='" + this.defaultStyle + "'>" + title + this.closeBtn + "</span>";
			$(saveMsg).insertBefore(element);
			return id;
		},
		removeLog: function(id){
			if (!id) {
				console.warn('UserLog - remove - id undefined ' + id);
			}
			$('#'+ this.logPrefix +'-' + id).remove();	
		}
	};


	return UserLog;
});