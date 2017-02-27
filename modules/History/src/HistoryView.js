define([
	'mustache',
	'utils/UserLog',
	'jquery',
	'pubsub',
], function(Mustache, UserLog, $, pubsub) {
	/**
	 * History view
	 * @exports History/HistoryView
	 */
	function HistoryView(parentHTML, displayHistory, displayTime) {
		this.el = undefined;
		this.hiddenElements = [];
		this.parentHTML = (parentHTML) ? parentHTML : $('#rightPanel');
		var tabsWrapper = this.parentHTML.find('.nav.nav-tabs');
		tabsWrapper.append('<li class="active"><a data-toggle="tab" href="#history-tab-pane">History</a></li>');
		var contentWrapper = this.parentHTML.find('.tab-content');
		this.$historyContainer = $('<div id="history-tab-pane" class="history-container tab-pane active"></div>');
		contentWrapper.append(this.$historyContainer);
		this.displayHistory = (typeof displayHistory !== "undefined") ? displayHistory : true;
		this.displayTime = !!displayTime;
		this.initController();
		this.initKeyboard();
		this.initSubscribe();
	}

	/**
	 * Render will build and display a new dom in parentHTML using model historyList
	 */
	HistoryView.prototype.render = function(model) {
		if (this.displayHistory === false || !this.$historyContainer) {
			return;
		}
		this.$historyContainer.empty();
		var $historyList = $('<ul class="history_ul">');
		this.$historyContainer.append($historyList);
		var text = '',
			classCurrent = "";
		// loop through each history state
		if (model) {
			var history = model.getSavedHistory();
			for (var i = 0, c = history.length; i < c; i++) {
				if (this.hiddenElements.indexOf(i) !== -1) {
					continue;
				}
				classCurrent = "";
				if (i == model.currentPosition) {
					classCurrent = "current";
				}
				text = '';
				if (history[i].title !== '') {
					text += history[i].title + ' ';
				}
				if (this.displayTime) {
					text += history[i].time;
				}
				if (i > 0 && i !== c - 1) {
					text += '<button type="button" class="close" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
				}
				$historyList.append('<li class="' + classCurrent + '" data-history="' + i + '">' + text + '</li>');
			}
		}
	};

	HistoryView.prototype.initKeyboard = function(evt) {
		$.subscribe('ctrl-z', function(el) {
			$.publish('HistoryView-moveSelectHistory', -1);
		});
		$.subscribe('ctrl-y', function(el) {
			$.publish('HistoryView-moveSelectHistory', 1);
		});
	};

	/**
	 * Publish event after receiving dom events
	 */
	HistoryView.prototype.initController = function() {
		var self = this;
		this.parentHTML.on('click', ".history_ul li", function() {
			var indexItem = parseInt($(this).attr('data-history'), 10);
			$.publish('HistoryView-selectHistory', indexItem);
		});
		this.parentHTML.on('click', 'button.close span', function() {
			var $wrapper = $(this).parents('li');
			if (!$wrapper.hasClass('current')) {
				self.hiddenElements.push($wrapper.data('history'));
				$wrapper.hide();
				return false;
			}
		});
	};

	/**
	 * Subscribe to model events
	 */
	HistoryView.prototype.initSubscribe = function() {
		var self = this;
		$.subscribe('HistoryModel-setCurrentPosition', function(el, model) {
			self.render(model);
		});
		$.subscribe('HistoryModel-addToHistory', function(el, model) {
			self.render(model);
		});
	};

	return HistoryView;
});