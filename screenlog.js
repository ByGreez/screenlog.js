(function () {

	var logEl,
		btnEl,
		toggleEl,
		isInitialized = false,
		_console = {}; // backup console obj to contain references of overridden fns.
		_options = {
			bgColor: 'rgba(0,0,0,0.8)',
			logColor: 'lightgreen',
			infoColor: 'blue',
			warnColor: 'orange',
			errorColor: 'red',
			freeConsole: false,
			css: '',
			autoScroll: true
		};

	function createElement(tag, css) {
		var element = document.createElement(tag);
		element.style.cssText = css;
		return element;
	}

	function createPanel() {
		var div = createElement('div', 'width:100%;word-break:break-all;z-index:2147483647;font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;padding:5px;text-align:left;position:fixed;right:0;top:0;min-width:200px;max-height:50vh; ' +
			'overflow:auto;display:grid;background:' + _options.bgColor + ';' + _options.css);

		return div;
	}

	function censor_fn(censor) {
		var i = 0;

		return function (key, value) {
			if (i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value)
				return '[Circular]';

			if (i >= 29) // seems to be a harded maximum of 30 serialized objects?
				return '[Unknown]';

			++i; // so we know we aren't using the original object anymore

			return value;
		};
	}

	function cleanStringify(object) {
		if (object && typeof object === 'object') {
			object = copyWithoutCircularReferences([object], object);
		}
		return JSON.stringify(object);

		function copyWithoutCircularReferences(references, object) {
			var cleanObject = {};
			Object.keys(object).forEach(function (key) {
				var value = object[key];
				if (value && typeof value === 'object') {
					if (references.indexOf(value) < 0) {
						references.push(value);
						cleanObject[key] = copyWithoutCircularReferences(references, value);
						references.pop();
					} else {
						cleanObject[key] = '###_Circular_###';
					}
				} else if (typeof value !== 'function') {
					cleanObject[key] = value;
				}
			});
			return cleanObject;
		}
	}
	function genericLogger(color) {
		return function() {
			var disp = (toggleEl.textContent === 'HIDE') ? "block;" : "none;";
			var el = createElement('div', 'line-height:18px;min-height:18px;background:' +
				(logEl.children.length % 2 ? 'rgba(255,255,255,0.1)' : '') + ';color:' + color+";display:"+ disp); // zebra lines
			var val = [].slice.call(arguments).reduce(function(prev, arg) {
				return prev + ' ' + (typeof arg === "object" ? cleanStringify(arg) : arg);
			}, '');
			el.textContent = val;
			el.className = "screenlog-msg";
			logEl.appendChild(el);

			// Scroll to last element, if autoScroll option is set.
			if(_options.autoScroll) {
				logEl.scrollTop = logEl.scrollHeight - logEl.clientHeight;
			}

		};
	}

	function clear() {
		logEl.innerHTML = '';
	}

	function log() {
		return genericLogger(_options.logColor).apply(null, arguments);
	}

	function info() {
		return genericLogger(_options.infoColor).apply(null, arguments);
	}

	function warn() {
		return genericLogger(_options.warnColor).apply(null, arguments);
	}

	function error() {
		return genericLogger(_options.errorColor).apply(null, arguments);
	}

	function setOptions(options) {
		for(var i in options)
			if(options.hasOwnProperty(i) && _options.hasOwnProperty(i)) {
				_options[i] = options[i];
			}
	}

	function toggleVisibility() {
		 var els = logEl.getElementsByClassName("screenlog-msg");
		for (var i = 0; i < els.length; i++) {
			if (els[i].style.display === "none") {
				els[i].style.display = "block";
			} else {
				els[i].style.display = "none";
			}
		}
		toggleEl.textContent = (toggleEl.textContent==='HIDE') ? "SHOW": "HIDE";


	}

	function clearMsgList() {
		var els = logEl.getElementsByClassName("screenlog-msg");

		while (els.length > 0) els[0].remove();
		// for (var i = 0; i < els.length; i++) {
		// 	els[i].parentElement.removeChild(els[i]);
		// }
	}

	function init(options) {
		if (isInitialized) { return; }

		isInitialized = true;

		if(options) {
			setOptions(options);
		}

		logEl = createPanel();
		btnEl = createElement('div', 'width:100%; height:25px; text-align:center; color:green; order:1; display:flex; flex-direction: row; align-items: center;font-size: 1.3em;');
		toggleEl = createElement('div','flex-grow:1;');
		toggleEl.textContent = "HIDE";
		var clearEl = createElement('div', 'flex-grow:1;color:orange;');
		var closeEl = createElement('div', 'flex-grow:1;color:red;');
		clearEl.textContent = "CLEAR";
		closeEl.textContent = "CLOSE";
		clearEl.onclick = clearMsgList;
		closeEl.onclick = destroy;
		toggleEl.onclick = toggleVisibility;

		btnEl.appendChild(toggleEl);
		btnEl.appendChild(clearEl);
		btnEl.appendChild(closeEl);
		logEl.appendChild(btnEl);
		document.body.appendChild(logEl);

		if (!_options.freeConsole) {
			// Backup actual fns to keep it working together
			_console.log = console.log;
			_console.clear = console.clear;
			_console.info = console.info;
			_console.warn = console.warn;
			_console.error = console.error;
			console.log = originalFnCallDecorator(log, 'log');
			console.clear = originalFnCallDecorator(clear, 'clear');
			console.info = originalFnCallDecorator(info, 'info');
			console.warn = originalFnCallDecorator(warn, 'warn');
			console.error = originalFnCallDecorator(error, 'error');
		}
	}

	function destroy() {
		isInitialized = false;
		console.log = _console.log;
		console.clear = _console.clear;
		console.info = _console.info;
		console.warn = _console.warn;
		console.error = _console.error;
		logEl.remove();
	}


	/**
	 * Checking if isInitialized is set
	 */
	function checkInitialized() {
		if (!isInitialized) {
			throw 'You need to call `screenLog.init()` first.';
		}
	}


	/**
	 * Decorator for checking if isInitialized is set
	 * @param  {Function} fn Fn to decorate
	 * @return {Function}      Decorated fn.
	 */
	function checkInitDecorator(fn) {
		return function() {
			checkInitialized();
			return fn.apply(this, arguments);
		};
	}

	/**
	 * Decorator for calling the original console's fn at the end of
	 * our overridden fn definitions.
	 * @param  {Function} fn Fn to decorate
	 * @param  {string} fn Name of original function
	 * @return {Function}      Decorated fn.
	 */
	function originalFnCallDecorator(fn, fnName) {
		return function() {
			fn.apply(this, arguments);
			if (typeof _console[fnName] === 'function') {
				_console[fnName].apply(console, arguments);
			}
		};
	}

	// Public API
	window.screenLog = {
		init: init,
		log: originalFnCallDecorator(checkInitDecorator(log), 'log'),
		clear: originalFnCallDecorator(checkInitDecorator(clear), 'clear'),
		info: originalFnCallDecorator(checkInitDecorator(clear), 'info'),
		warn: originalFnCallDecorator(checkInitDecorator(warn), 'warn'),
		error: originalFnCallDecorator(checkInitDecorator(error), 'error'),
		destroy: checkInitDecorator(destroy),
		toggle:  checkInitDecorator(toggleVisibility)
	};
})();
