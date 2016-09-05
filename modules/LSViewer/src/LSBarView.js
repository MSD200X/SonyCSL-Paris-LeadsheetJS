define(['vexflow'], function(Vex) {
	/**
    * LSBarView is a module called by CanvasLayer to draw bars
    * @exports LSViewer/LSBarView
    */
	function LSBarView(barDimensions, options) {
		this.vexflowStave = new Vex.Flow.Stave(barDimensions.left, barDimensions.top, barDimensions.width, options);
		this.drawClef = !!options.draw_clef;
		this.drawKeySignature = !!options.draw_key_signature;
		this.drawStaveNumbers = options.draw_stave_numbers === undefined ? true : !!options.draw_stave_numbers;
	}

	LSBarView.prototype.draw = function(ctx, songIt, sectionIt, positions) {
		var bar = songIt.getBar(),
			followingBar = songIt.getFollowingBar(),
			ending = bar.getEnding();

		if (songIt.getBarIndex() === 0 && this.drawClef) {
			this.vexflowStave.addClef("treble").setContext(ctx).draw();
		}
		//name section
		if (sectionIt.getBarIndex() === 0 && sectionIt.getSection().displayName) {
			var nameSection = sectionIt.getSection().getName();
			var repeatSection = parseInt(sectionIt.getSection().getRepeatTimes(), 10) + 1;
			var textRepeatSection = '';
			if (repeatSection > 1) {
				textRepeatSection += ' (x' + repeatSection + ')';
			}
			if (nameSection !== "") {
				this.vexflowStave.setSection(nameSection + textRepeatSection, 9);
			}
		}

		//Bar number
		if (this.drawStaveNumbers === true) {
			ctx.font = "10px Verdana"; // font for staves number
			ctx.fillStyle = "#900";
			var position = this.getVexflowStave();
			ctx.fillText(songIt.getBarIndex() + 1, position.x + 3, position.y + 37);
			ctx.fillStyle = "#000";
			ctx.font = "18px Verdana";
		}

		var keySignatureString = songIt.getBarKeySignature();
		if (keySignatureString != songIt.getPrevKeySignature() && this.drawKeySignature) {
			var keySignature = new Vex.Flow.KeySignature(keySignatureString);
			var prevKeySignature = songIt.getPrevKeySignature();
			// see https://github.com/0xfe/vexflow/issues/335
			if (prevKeySignature !== null && prevKeySignature !== "C") {
				keySignature.cancelKey(prevKeySignature);
			}
			keySignature.addToStave(this.vexflowStave);
		}

		var timeSignature = songIt.getBarTimeSignature();

		if (timeSignature.toString() != songIt.getPrevTimeSignature()) {
			this.vexflowStave.addTimeSignature(timeSignature.toString());
		}

		// endings
		if (ending && ending !== songIt.getPreviousBar().getEnding()) {
			var endingState = (sectionIt.isLastBar() || followingBar.getEnding() !== bar.getEnding()) ? 'BEGIN_END' : 'BEGIN';
			this.vexflowStave.setVoltaType(Vex.Flow.Volta.type[endingState], ending + ".", positions.ENDINGS_Y);
		} else if (ending) {
			if (sectionIt.isLastBar() || (followingBar && followingBar.getEnding() !== ending)) {
				this.vexflowStave.setVoltaType(Vex.Flow.Volta.type.END, ending + ".", positions.ENDINGS_Y);
			} else if (ending === songIt.getPreviousBar().getEnding()) {
				this.vexflowStave.setVoltaType(Vex.Flow.Volta.type.MID, ending + ".", positions.ENDINGS_Y);
			}
		}
		if (ending && (followingBar && followingBar.getEnding() !== ending)) {
			this.vexflowStave.setEndBarType(Vex.Flow.Barline.type.REPEAT_END);
		}
		var label = bar.getLabel();
		var labelsY = positions.LABELS_BAR_START_Y ? positions.LABELS_BAR_START_Y : positions.LABELS_Y;
		if (label === 'coda' || label === 'coda2') {
			var codaPositioning = Vex.Flow.Repetition.type.CODA_RIGHT;
			if (songIt.hasLabelInPrecedingBars(label)) {
				codaPositioning = Vex.Flow.Repetition.type.CODA_LEFT;
				labelsY += 25;
			}
			this.vexflowStave.setRepetitionTypeRight(codaPositioning, labelsY);
		}
		if (label === 'segno' || label === 'segno2') {
			this.vexflowStave.setRepetitionTypeLeft(Vex.Flow.Repetition.type.SEGNO_LEFT, labelsY);
		}
		var sublabel = bar.getSublabel(true);
		if (sublabel != null) {
			this.vexflowStave.setRepetitionTypeRight(Vex.Flow.Repetition.type[sublabel], labelsY + 25);
		}
		if (sectionIt.isLastBar()) {
			this.vexflowStave.setEndBarType(Vex.Flow.Barline.type.END);
		}
		this.vexflowStave.setContext(ctx).draw();

	};
	LSBarView.prototype.getKeySignature = function() {
		return this.keySignature;
	};
	LSBarView.prototype.getVexflowStave = function() {
		return this.vexflowStave;
	};


	return LSBarView;
});