define([
	'utils/AjaxUtils',
], function(AjaxUtils) {
	return {
		run: function() {
			test("AjaxUtils", function(assert) {
				assert.throws(function() {
					AjaxUtils.request();
				}, 'Empty request should throw an exception');

				assert.throws(function() {
					AjaxUtils.request({
						type: 'GET',
						data: data,
						dataType: 'json',
						withCredentialsBool: true
					});
				}, 'Request without url should throw an exception');


				// servletRequest function : use like that
				/*AjaxUtils.servletRequest('flow', 'harmonizer',{'id':xxx}, function(data){
					console.log(data);
				});*/
				assert.throws(function() {
					AjaxUtils.servletRequest();
				}, 'Empty request should throw an exception');
				assert.throws(function() {
					AjaxUtils.servletRequest('ServletRoot');
				}, 'Empty servletTitle or ServletRoot should throw an exception');
			});
		}
	};
});