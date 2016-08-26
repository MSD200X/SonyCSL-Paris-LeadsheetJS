define(['jquery'], function($) {
	var AjaxUtils = {};

	/**
	 * Use this function whenever you need to do an ajax request, ajax request allow you to ask a server language from javascript executed by client
	 * @param  {Object}   request                 Request object contain url, type, data, dataType, withCredentialsBool
		 * @param  {text}   url                   Distant url you want to reach, it can be relative or absolute
		 * @param  {text}   type                  Server Request (GET, POST ...)
		 * @param  {Object}   data                Contain a JS object that you want to send to the server
		 * @param  {bool}   withCredentialsBool   Allow outrepassing CORS restriction, see jQuery documentation
	 * @param  {Function} callback            Function call when the request is complete, always launch whenever there is an error or not
	 */
	AjaxUtils.request = function(request, callback) {
		if (typeof request === "undefined") {
			throw 'AjaxUtils - ajaxRequest - request argument is undefined ' + request;
		}
		if (typeof request.url === "undefined") {
			throw 'AjaxUtils - ajaxRequest - url argument is undefined ' + url;
		}
		if (typeof request.type === "undefined") {
			request.type = 'GET';
		}
		if (typeof request.data === "undefined") {
			request.data = {};
		}
		if (typeof request.dataType === "undefined") {
			request.dataType = 'jsonp';
		}
		if (typeof request.withCredentialsBool === "undefined") {
			request.withCredentialsBool = false;
		}
		$.ajax({
			url: request.url,
			dataType: request.dataType,
			type: request.type,
			data: request.data,
			xhrFields: {
				withCredentials: request.withCredentialsBool
			},
			success: function(data) {
				if (typeof callback !== "undefined") {
					callback(data);
				}
			},
			error: function(query, errorType, error) {
				console.warn('AjaxUtils - Ajax Request fail ' + errorType + ' : ' + error.message);
				if (typeof callback !== "undefined") {
					callback(error);
				}
			}
		});
	};

	AjaxUtils.setDefaultDomain = function(defaultDomain) {
		this.defaultDomain = defaultDomain;
	};

	/**
	 * Direct link to the servlet ajax request with predefined ajax options
	 * @param  {string}   servletRoot Servlet context root, eg. 'rechord', 'jsonsong', 'flow'
	 * @param  {string}   servletName Servlet name eg. 'composer', 'harmonize', 'radiofeed'
	 * @param  {Object}   data        Contain a JS object that you want to send to the server
	 * @param  {Function} callback    Function call when the request is complete, always launch whenever there is an error or not
	 */
	AjaxUtils.servletRequest = function(servletRoot, servletName, data, callback) {
		if (typeof servletRoot === "undefined") {
			throw 'AjaxUtils - servletRequest - servletRoot argument is undefined ' + servletRoot;
		}
		if (typeof servletName === "undefined") {
			throw 'AjaxUtils - servletRequest - servletName argument is undefined ' + servletName;
		}
		var request = {
			url: this.defaultDomain + servletRoot + '/' + servletName,
			type: 'POST',
			data: data,
			dataType: 'json',
			withCredentialsBool: true
		};
		AjaxUtils.request(request, callback);
	};


	return AjaxUtils;
});