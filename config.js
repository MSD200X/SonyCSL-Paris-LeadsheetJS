require.config({
	// baseUrl: "./",
	deps: ['jquery', 'pubsub', 'bootstrap', 'vexflow'],
	paths: {
		jquery: 'node_modules/jquery/dist/jquery.min',
		jquery_autocomplete: 'external-libs/jquery.autocomplete.min',
		vexflow: 'node_modules/vexflow/releases/vexflow-min',
		Midijs: 'external-libs/Midijs/midijs.min',
		base64: 'external-libs/base64',
		pubsub: 'external-libs/tiny-pubsub.min',
		mustache: 'node_modules/mustache/mustache.min',
		text: 'node_modules/requirejs-text/text',
		bootstrap: 'node_modules/bootstrap/dist/js/bootstrap.min',
		jsPDF: 'node_modules/jspdf/dist/jspdf.min',
		underscore: 'node_modules/underscore/underscore-min',
		store: 'node_modules/store/store.min',
	},
	shim: {
		jsPDF : {
			exports : 'jsPDF'
		},
		jquery: {
			exports: '$'
		},
		pubsub: {
			deps: ['jquery']
		},
		bootstrap: {
			deps: ['jquery']
		},
		vexflow: {
			exports: 'Vex'
		},
		Midijs: {
			exports: 'MIDI',
			deps: ['base64']
		},
		underscore : {
			exports: '_'	
		},
		jquery_autocomplete: {
			deps: ['jquery']
		}
	}
});