
define([
		'vexflow',
		'modules/LSViewer/src/LSNoteView',
		'modules/NoteEdition/src/NoteSpaceView',
		'modules/LSViewer/src/LSChordView',
		'modules/LSViewer/src/LSBarView',
		'modules/LSViewer/src/BeamManager',
		'modules/LSViewer/src/TieManager',
		'modules/LSViewer/src/TupletManager',
		'modules/LSViewer/src/BarWidthManager',
		'modules/core/src/SectionBarsIterator',
		'modules/core/src/SongBarsIterator',
		'modules/LSViewer/src/CanvasLayer',
		'modules/LSViewer/src/Scaler',
		'jquery',
		'modules/LSViewer/src/SymbolsPositioner'
	],
	function(Vex, LSNoteView, NoteSpaceView, LSChordView, LSBarView, BeamManager, TieManager, TupletManager, BarWidthManager, SectionBarsIterator, SongBarsIterator, CanvasLayer, Scaler, $, SymbolsPositioner) {
		/**
		 * LSViewer module manage interaction between canvas, core model and vexflow, it's the main module that allow drawing
		 * @exports LSViewer/LSViewer
		 * @param {domObject} jQuery divContainer ; e.g.: $("#divContainerId");
		 * @param {Object} params, possible params:
		 *<ul>
		 *  <li>width: in pixels</li>
		 *  <li>heightOverflow: "scroll" | "auto".</li>
		 *    If scroll, when canvas is larger than containing div, it will scroll, if not, it will change div width
		 *  <li>typeResize: "scale" | "fluid",
		 *    If scale, when canvas is wider than containing div, it will scale to fit; if "fluid" it will try to fit withouth scaling. // TODO: possibility of combining both (scale partially and then fluid)
		 *  <li>displayTitle</li>
		 *  <li>displayComposer</li>   
		 *  <li>layer: true 	// Layer represents the interaction layer, so if true, can use mouse (but layer=true is not enough to be able to select notes)</li>
		 *
		 */
		function LSViewer(divContainer, params) {
			this._init(divContainer, params);
			this._initSubscribe();
		}
		LSViewer.prototype._init = function(divContainer, params) {
			if (!$(divContainer).prop("tagName")){
				throw "LSViewer: divContainer is not a valid Dom element";
			}
			params = params || {};
			this.DEFAULT_HEIGHT = 1000;
			this.scaler = new Scaler(); //object that scales objects. Used in NoteSpaceView and ChordSpaceView
			this.SCALE = null; //scale from 0 to 1 
			//0.999  fixes vexflow bug that doesn't draw last pixel on end bar
			this.SCALE_FIX = 0.995;

			this.CANVAS_DIV_WIDTH_PROPORTION = 1; //width proportion between canvas created and divContainer (space between canvas border and divContainer border)
			this.NOTE_WIDTH = 20; // estimated note width in order to be more flexible
			this.LINE_WIDTH = 1550;
			this.BARS_PER_LINE = 4;
			this.ENDINGS_Y = 20; //0 -> thisChordsPosY==40, the greater the closer to stave 
			this.LABELS_Y = 10; //like this.ENDINGS_Y
			this.CHORDS_DISTANCE_STAVE = params.chordDistanceStave || 10; //distance from stave (if negative, will be insied stave)
			this.DISPLAY_TITLE = params.displayTitle != undefined ? params.displayTitle : true;
			this.DISPLAY_COMPOSER = params.displayComposer != undefined ? params.displayComposer : true;
			// constant with INITIAL prefix refer to inital values, as they can be changed when visualizing audio
			this.INITIAL_LINE_HEIGHT = params.initialLineHeight || 150;
			this.INITIAL_MARGIN_TOP = 100;
			this.INITIAL_LINE_MARGIN_TOP = 0;
			this.LAST_BAR_WIDTH_RATIO = 0.75; //in case of this.shortenLastBar = true (rendering audio), we make the last bar more compressed so that we left space for recordings longer than piece
			this.FONT_CHORDS = params.fontChords || "18px Verdana";
			this.PADDING_LEFT_CHORDS = params.paddingLeftChords || 0;

			this.DRAW_STAVE_NUMBERS = params.drawStaveNumbers === undefined ? true : params.drawStaveNumbers;
			this.ONLY_CHORDS = !!params.onlyChords;
			this.DRAW_CLEF = !params.onlyChords;
			this.DRAW_KEY_SIGNATURE = !params.onlyChords;
			this.DRAW_STAVE_LINES = params.drawStaveLines === undefined ? true : params.drawStaveLines;
			this.TEXT_CLOSER_TO_STAVE = !!params.onlyChords;

			this.CURSOR_MARGIN_LEFT = 6;
			this.CURSOR_MARGIN_TOP = 20;
			this.CURSOR_MARGIN_RIGHT = 9;
			this.CURSOR_HEIGHT = 80;
						
			//by default false, needed when ChordSpaceManager is in mode 'ONLY_CHORDS' (nothing to do with LSViewer.ONLY_CHORDS )
			//SAVE_CHORDS will save coordenates of drawed chords in an array (so there more memory needed)
			this.SAVE_CHORDS = params.saveChords === undefined  ? false : params.saveChords; 
			
			// for edition CanvasLayer should be interactive, but if we only want to play we need canvasLayer to update cursor, but we may not want interaction
			this.INTERACTIVE_CANVAS_LAYER = params.interactiveCanvasLayer === undefined ? true : params.interactiveCanvasLayer;

			//next three fields are set as vars and not constants because they change (e.g. when visualizing audio)
			this.lineMarginTop = this.INITIAL_LINE_MARGIN_TOP;
			this.marginTop = this.INITIAL_MARGIN_TOP;
			this.lineHeight = this.INITIAL_LINE_HEIGHT;
			this.offsetFirstBar = null; // it is set when drawing

			if (!this.DISPLAY_TITLE) this.marginTop -= 70;
			if (!this.DISPLAY_COMPOSER) this.marginTop -= 30;

			this.shortenLastBar = false;

			this.heightOverflow = params.heightOverflow || "auto";
			this.divContainer = divContainer;
			this.resizable = !params.width; //if there is a width specified, we assume that it wont be resized on window resize

			this.canvasId = "ls" + ($("canvas").length + 1);
			var width = (params.width) ? params.width : this._getWidthFromContainer(divContainer);
			this.detectEventOnAllDocument = !!params.detectEventOnAllDocument; // canvasLayer attributes
			this.canvas = this._createCanvas(this.canvasId, width, this.DEFAULT_HEIGHT);
			var renderer = new Vex.Flow.Renderer(this.canvas, Vex.Flow.Renderer.Backends.CANVAS);
			this.ctx = renderer.getContext("2d");
			

			this.typeResize = params.typeResize || "fluid";
			this._resize(width);
			this.layer = params.layer;

		};

		LSViewer.prototype._getWidthFromContainer = function(divContainer) {
			return $(this.divContainer).width() * this.CANVAS_DIV_WIDTH_PROPORTION;
		};
		/**
		 * Creates and returns a dom element
		 */
		LSViewer.prototype._createCanvas = function(canvasId, width, height) {
			var canvas = $("<canvas id='" + canvasId + "'></canvas>");
			canvas[0].width = width;
			canvas[0].height = height;

			canvas.appendTo(this.divContainer);
			var divCss = {
				textAlign: "center",
			};
			this.barWidthMng = null;

			$(this.divContainer).css(divCss);
			return canvas[0];
		};

		LSViewer.prototype._initSubscribe = function() {
			var self = this;
			$.subscribe('ToViewer-draw', function(el, songModel, forceNewCanvasLayer) {
				if (!songModel) {
					throw "Need songModel to draw";
				}
				self.forceNewCanvasLayer = forceNewCanvasLayer;
				self.draw(songModel);
			});

			$.subscribe('ToViewer-resize', function(el, songModel) {
				if (!songModel) {
					throw "Need songModel to draw";
				}
				var width = self._getWidthFromContainer(this.divContainer);
				if (self.canvas.width !== width) {
					console.log('resize!!!!')
					self.canvas.width = width;
					self._resize(width);
					self.forceNewCanvasLayer = true;
					self.draw(songModel);
				}
			});
		};
		LSViewer.prototype._resize = function(width) {
			if (this.typeResize == 'scale') {
				var scale = width / this.LINE_WIDTH;
				this.setScale(scale * this.SCALE_FIX);
			} else { // typeResize == 'fluid'
				this.setScale(this.SCALE_FIX);
				this._setWidth(width);
			}

		};
		LSViewer.prototype._setWidth = function(width) {
			var viewerWidth = width || this.LINE_WIDTH;
			//if (viewerWidth < this.LINE_WIDTH){
			this.LINE_WIDTH = viewerWidth;
			//}
		};

		LSViewer.prototype.scale = function(ctx) {
			ctx = ctx || this.ctx;
			ctx.scale(this.SCALE, this.SCALE);
		};
		LSViewer.prototype.resetScale = function(ctx) {
			ctx = ctx || this.ctx;
			ctx.scale(1 / this.SCALE, 1 / this.SCALE);
		};
		/**
		 * function useful to be called in 'draw' function between this.scale() and this.resetScale().
		 * It takes the width without taking into account we are scaling. This way we can place elements correctly (e.g. centering the title)
		 */
		LSViewer.prototype._getNonScaledWidth = function() {
			return this.canvas.width / this.SCALE;
		};
		/**
		 * gets the BoundingBox
		 * @param  {Object} metrics ( return by ctx.getMeasureText )
		 * @param  {Integer} height  
		 * @return {Object}   with properties x,y,w,h
		 */
		/**
		 * returns getBoundingBox
		 * @param  {Context} ctx          
		 * @param  {String} value        
		 * @param  {Number} x            
		 * @param  {Number} y            
		 * @return {Object}              {x:, y:, w:, h:}
		 */
		LSViewer.prototype._getTextBoundingBox = function(ctx, value, x, y) {
			var metrics = ctx.measureText(value);
			var width, substractY, height, substractX;
			// new browsers should 
			if (metrics.actualBoundingBoxAscent !== undefined) {
				width = metrics.actualBoundingBoxRight;
				substractY = metrics.actualBoundingBoxAscent;
				height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
			} else {
				substractY = Number(ctx.font.substr(0, ctx.font.indexOf("px")));
				width = metrics.width;
				height = substractY;
			}
				//if not top, hanging nor middle, other values are bottom, alpabetic, ideographic (we do not make difference)
			substractY = ctx.textBaseline === 'middle' ? substractY / 2 : 
				ctx.textBaseline === 'top' || ctx.textBaseline === 'hanging' ? 0 : substractY ;
			//we assume start and left are the same, for the moment, only support for ltr (occidental) language
			substractX = ctx.textAlign === 'center' ? width / 2 :
				ctx.textAlign === 'start' || ctx.textAlign === 'left' ? 0 : width;

			var boundingBox = {
				x: x - substractX,
				y: y - substractY,
				w: width,
				h: height
			};
			return boundingBox;
		};

		LSViewer.prototype._displayTitle = function(title) {
			var oldTextAlign = this.ctx.textAlign;
			this.ctx.textAlign = 'center';
			this.ctx.textBaseline = 'bottom';
			this.ctx.font = "32px lato Verdana";
			var x = this._getNonScaledWidth() / 2,
				y = 60,
				maxWidth = this.canvas.width;
			this.ctx.fillText(title, x, y, maxWidth);
			this.titleView = this._getTextBoundingBox(this.ctx, title, x, y);
			this.ctx.textAlign = oldTextAlign;
		};

		LSViewer.prototype._displayComposer = function(composer) {
			var oldTextAlign = this.ctx.textAlign;
			this.ctx.textAlign = 'right';
			this.ctx.font = "24px lato Verdana";
			if (typeof composer === "undefined") {
				composer = 'Unknown';
			}
			var x = this._getNonScaledWidth() - 20,
				y = 20,
				maxWidth = this._getNonScaledWidth();
			this.ctx.fillText(composer, x, y, maxWidth);
			this.composerView = this._getTextBoundingBox(this.ctx, composer, x, y);
			this.ctx.textAlign = oldTextAlign;

		};
		LSViewer.prototype.setScale = function(scale) {
			this.SCALE = scale;
			this.scaler.setScale(scale);
		};
		LSViewer.prototype.setLineMarginTop = function(lineMarginTop, bottom) {
			if (!bottom) {
				this.marginTop += lineMarginTop;
			} else {
				this.lineMarginTop = lineMarginTop;
			}
			this.lineHeight += lineMarginTop;
		};

		LSViewer.prototype.getLineHeight = function() {
			return this.lineHeight;
		};
		LSViewer.prototype.setLineHeight = function(lineHeight) {
			if (!isNaN(lineHeight)) {
				this.lineHeight = lineHeight;
			}
		};
		LSViewer.prototype.resetLinesHeight = function() {
			this.lineHeight = this.INITIAL_LINE_HEIGHT;
			this.marginTop = this.INITIAL_MARGIN_TOP;
			this.lineMarginTop = this.INITIAL_LINE_MARGIN_TOP;
		};

		LSViewer.prototype.setHeight = function(song, barWidthMng) {
			var totalNumBars = song.getComponent("bars").getTotal();
			this.canvas.height = (barWidthMng.getDimensions(totalNumBars - 1).top + this.lineHeight) * this.SCALE;
			
			if (this.canvas.height != $(this.divContainer).height()) {
				if (this.heightOverflow == 'scroll') {
					$(this.divContainer).css({
						overflowY: "scroll"
					});
				} else {
					$(this.divContainer).height(this.canvas.height);
				}
			}
		};
		LSViewer.prototype.setShortenLastBar = function(bool) {
			this.shortenLastBar = bool;
		};

		LSViewer.prototype.draw = function(song) {
			if (typeof song === "undefined") {
				console.warn('song is empty'); // only for debug, remove after 1 week safe
				return;
			}
			//console.log("draw");
			//console.time('whole draw');
			var i, j, v, c;

			var numBar = 0,
				self = this,
				nm = song.getComponent("notes"),
				cm = song.getComponent("chords"),
				barNotes,
				barChords,
				beamMng,
				tupletMng,
				bar,
				noteView,
				chordView,
				iNote = 0,
				stave,
				vxfBeams,
				noteViews = [],
				chordViews = [],
				barNoteViews,
				vxfBars = [],
				barDimensions,
				sympolsPositions,
				tieMng = new TieManager();

			var lastBarWidthRatio = this.shortenLastBar ? this.LAST_BAR_WIDTH_RATIO : 1;
			this.barWidthMng = new BarWidthManager(this.lineHeight, this.LINE_WIDTH, this.NOTE_WIDTH, this.BARS_PER_LINE, this.marginTop, lastBarWidthRatio);
			this.barWidthMng.calculateBarsStructure(song, nm, cm, this.ctx, this.FONT_CHORDS);
			var symbolsPositioner = new SymbolsPositioner(
				song,
				this.barWidthMng,
				{
					ENDINGS_Y: self.ENDINGS_Y,
					LABELS_Y: self.LABELS_Y,
					CHORDS_DISTANCE_STAVE : self.CHORDS_DISTANCE_STAVE
				}
			);
			symbolsPositioner.setElementsPositonsByLine();
			this.setHeight(song, this.barWidthMng);
			this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
			this.scale();

			var numSection = 0;
			var songIt = new SongBarsIterator(song);
			var barView;
			var sectionIt;

			song.getSections().forEach(function(section) {

				// for each bar
				sectionIt = new SectionBarsIterator(section);
				while (sectionIt.hasNext()) {
					//console.time('whole bar');
					barNoteViews = [];

					beamMng = new BeamManager();
					tupletMng = new TupletManager();
					bar = [];
					var tmpNote;
					if (!self.ONLY_CHORDS) {
						barNotes = nm.getNotesAtCurrentBar(songIt);

						for (j = 0, v = barNotes.length; j < v; j++) {
							tmpNote = iNote + j;
							tieMng.checkTie(barNotes[j], tmpNote);
							tupletMng.checkTuplet(barNotes[j], j);
						}

						var beamIndexes = beamMng.getBeamIndexes(barNotes, tupletMng, songIt);
						
						for (j = 0, v = barNotes.length; j < v; j++){
							//tmpNote = iNote + j;
							noteView = new LSNoteView(barNotes[j]);
							bar.push(noteView.getVexflowNote());
							barNoteViews.push(noteView);
						}
						beamMng.setBeams(beamIndexes, barNoteViews);
						iNote += barNotes.length;
					}
					//BARS
					barDimensions = self.barWidthMng.getDimensions(songIt.getBarIndex());
					var symbolsPositions = symbolsPositioner.getPositionsForBarIndex(songIt.getBarIndex());
					var barViewParams = {
						draw_clef: self.DRAW_CLEF,
						draw_key_signature: self.DRAW_KEY_SIGNATURE,
						draw_stave_numbers: self.DRAW_STAVE_NUMBERS
					};
					if (!self.DRAW_STAVE_LINES) {
						barViewParams.fill_style = "#FFF"; //we assume background is white
					}
					if (self.TEXT_CLOSER_TO_STAVE) { //this way, endings and text such as coda, segno, section names are closer
						barViewParams.top_text_position = 0;
					}

					barView = new LSBarView(barDimensions, barViewParams);
					barView.draw(self.ctx, songIt, sectionIt, symbolsPositions);
					
					var vxfBar = {
						barDimensions: barDimensions,
						timeSignature: songIt.getBarTimeSignature(),
						symbolsPositions: symbolsPositions,
					};
					
					// we just calculate offset for first bar
					// start_x inidicates the offset where notes start, to get the relative offset we should compare it with barDimensions.left, 
					// but when i == 0 we that know barDimensions.left == 0
					var offset = 0;
					if (songIt.getBarIndex() === 0){
						vxfBar.offset = barView.vexflowStave.start_x;
						offset = vxfBar.offset;
					}
					vxfBars.push(vxfBar);

					barChords = cm.getChordsByBarNumber(songIt.getBarIndex());
					for (i = 0, c = barChords.length; i < c; i++) {
					
						chordView = new LSChordView(barChords[i]).draw(
							self.ctx,
							barDimensions,
							songIt.getBarTimeSignature(),
							symbolsPositions.CHORDS_DISTANCE_STAVE,
							self.FONT_CHORDS,
							symbolsPositions.PADDING_LEFT_CHORDS > 0 ? symbolsPositions.PADDING_LEFT_CHORDS : self.PADDING_LEFT_CHORDS,
							self.SAVE_CHORDS ? self._getTextBoundingBox : null,
							offset
						);
						if (self.SAVE_CHORDS) chordViews.push(chordView);
					}
					vxfBeams = beamMng.getVexflowBeams(); // we need to do getVexflowBeams before drawing notes

					if (!self.ONLY_CHORDS) {
						Vex.Flow.Formatter.FormatAndDraw(self.ctx, barView.getVexflowStave(), bar, {
							autobeam: false
						});
						beamMng.draw(self.ctx, vxfBeams); // and draw beams needs to be done after drawing notes
						tupletMng.draw(self.ctx, barNoteViews);
						noteViews = noteViews.concat(barNoteViews);
					}
					songIt.next();
					sectionIt.next();
				}
				numSection++;
			});
			tieMng.draw(this.ctx, noteViews, nm, this.barWidthMng, song);
			
			this.chordViews = chordViews;
			this.vxfBars = vxfBars;
			this.ctx.fillStyle = "black";
			this.ctx.strokeStyle = "black";
			if (this.DISPLAY_COMPOSER) {
				this._displayComposer(song.getComposer());
			}
			if (this.DISPLAY_TITLE) {
				this._displayTitle(song.getTitle());
			}
			this.ctx.globalAlpha = 1;
			this.resetScale();

			// if constructor was supposed to have a layer and either canvasLayer is not created, either we are forcing to recreate it (e.g. on resize)
			if (this.layer && (this.forceNewCanvasLayer || !this.canvasLayer)) {
				this.forceNewCanvasLayer = false;
				if (this.canvasLayer) {
					this.canvasLayer.destroy(); //to remove html listeners
				}
				this.canvasLayer = new CanvasLayer(this, this.detectEventOnAllDocument, this.INTERACTIVE_CANVAS_LAYER); //the canvasLayer needs to be created after the score has been drawn
			}
			this.noteViews = this._getNoteViewsArea(noteViews);
			$.publish('LSViewer-drawEnd', this);
		};

		LSViewer.prototype._getNoteViewsArea = function(noteViews) {
			var noteSpaceViews = [], area;

			for (var i = 0; i < noteViews.length; i++) {
				area = noteViews[i].getArea();
				area.x -= this.CURSOR_MARGIN_LEFT;
				area.y += this.CURSOR_MARGIN_TOP;
				area.w += this.CURSOR_MARGIN_LEFT + this.CURSOR_MARGIN_RIGHT;
				area.h = this.CURSOR_HEIGHT;
				noteSpaceViews.push(new NoteSpaceView(area, this.scaler));
			}
			return noteSpaceViews;
		};
		/**
		 * When drawing an element from another module, it has to use this function
		 * @param  {Function} drawFunc function that draws the element
		 */
		LSViewer.prototype.drawElem = function(drawFunc) {
			this.scale(this.ctx);
			drawFunc();
			this.resetScale(this.ctx);
		};
		return LSViewer;

	});