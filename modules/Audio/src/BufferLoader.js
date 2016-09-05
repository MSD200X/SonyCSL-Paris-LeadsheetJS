define([], 
  function() {
    function BufferLoader(context, urlList, callback) {
      this.context = context;
      this.urlList = urlList;
      this.onload = callback;
      this.bufferList = [];
      this.loadCount = 0;
    }

    BufferLoader.prototype.loadBuffer = function(url, index) {
      // Load buffer asynchronously
      var request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.responseType = "arraybuffer";

      var loader = this;

      var _callOnLoad = function() {
        if (++loader.loadCount === loader.urlList.length) {
            loader.onload();
        }
      };

      request.onload = function() {
        // Asynchronously decode the audio file data in request.response
        loader.context.decodeAudioData(
          request.response,
          function(buffer) {
            if (!buffer) {
              console.error('error decoding file data: ' + url);
              return;
            }
            loader.bufferList[index] = buffer;
            _callOnLoad();
          },
          function(error) {
            console.error('decodeAudioData error', error);
          }
        );
      };

      request.onerror = function() {
        console.log('BufferLoader: XHR error');
        loader.bufferList[index] = false;
        _callOnLoad();
      };

      request.send();
    };

    BufferLoader.prototype.load = function() {
        for (var i = 0; i < this.urlList.length; ++i) {
            this.loadBuffer(this.urlList[i], i);
        }
    };
  
  return BufferLoader;
});