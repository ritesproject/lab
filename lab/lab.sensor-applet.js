(function() {
/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../../vendor/almond/almond", function(){});

/*global define: false*/

/**

  mini-class.js

  Minimalist classical-OO style inheritance for JavaScript.
  Adapted from CoffeeScript and SproutCore.

  Richard Klancer, 7-23-2012
*/
define('common/mini-class',[],function() {

  function mixin(dest, src) {
    var hasProp = {}.hasOwnProperty,
        key;

    for (key in src) {
      if (hasProp.call(src, key)) dest[key] = src[key];
    }
  }

  //
  // Remember that "classes" are just constructor functions that create objects, and that the
  // constructor function property called `prototype` is used to define the prototype object
  // (aka the __proto__ property) which will be assigned to instances created by the constructor.
  // Properties added to the prototype object of a constructor effectively become the instance
  // properties/methods of objects created with that constructor, and properties of the prototype
  // of the prototype are effectively "superclass" instance properties/methods.
  //
  // See http://javascriptweblog.wordpress.com/2010/06/07/understanding-javascript-prototypes/
  //

  /**
    Assuming Child, Parent are classes (i.e., constructor functions):
      1. Copies the properties of the Parent constructor to the Child constructor (These can be
         considered "class properties"/methods, shared among all instances of a class.)
      2. Adds Parent's prototype to Child's prototype chain.
      3. Adds Parent's prototype to the '__super__' property of Child.
  */
  function extend(Child, Parent) {

    // First, copy direct properties of the constructor object ("class properties") from Parent to
    // Child.
    mixin(Child, Parent);

    // First step in extending the prototype chain: make a throwaway constructor, whose prototype
    // property is the same as the Parent constructor's prototype property. Objects created by
    // calling `new PrototypeConstructor()` will have the *same* prototype object as objects created
    // by calling `new Parent()`.
    function PrototypeConstructor() {
      this.constructor = Child;
    }
    PrototypeConstructor.prototype = Parent.prototype;

    // Now use PrototypeConstructor to extend the prototype chain by one link.
    // That is, use PrototypeConstructor to make a new *object* whose prototype object
    // (__proto__ property) is Parent.prototype, and assign the object to the Child constructor's
    // prototype property. This way, objects created by calling "new Child()"
    // will have a prototype object whose prototype object in turn is Parent.prototype.
    Child.prototype = new PrototypeConstructor();

    // Assign the prototype used by objects created by Parent to the __super__ property of Child.
    // (This property can be accessed within a Child instance as `this.constructor.__super__`.)
    // This allows a Child instance to look "up" the prototype chain to find instances properties
    // defined in Parent that are overridden in Child (i.e., defined on Child.prototype)
    Child.__super__ = Parent.prototype;
  }

  /**
    Defines a "class" whose instances will have the properties defined in `prototypeProperties`:
      1. Creates a new constructor, which accepts a list of properties to be copied directly onto
         the instance returned by the constructor.
      2. Adds the properties in `prototypeProperties` to the prototype object shared by instances
         created by the constructor.
  */
  function defineClass(prototypeProperties) {
    function NewConstructor(instanceProperties) {
       mixin(this, instanceProperties);
    }
    mixin(NewConstructor.prototype, prototypeProperties);
    return NewConstructor;
  }

  /**
    Given ParentClass, return a new class which is ParentClass extended by childPrototypeProperties
  */
  function extendClass(ParentClass, childPrototypeProperties) {
    function ChildConstructor(instanceProperties) {
      mixin(this, instanceProperties);
    }
    // Extend ParentClass first so childPrototypeProperties override anything defined in ParentClass
    extend(ChildConstructor, ParentClass);
    mixin(ChildConstructor.prototype, childPrototypeProperties);
    return ChildConstructor;
  }

  return {
    defineClass: defineClass,
    extendClass: extendClass,
    mixin: mixin
  };

});

/*global define: false*/

define('sensor-applet/mini-event-emitter',[],function() {
  /**
    Basic event-emitter functionality to mixin to other classes.

    TODO: needs explicit tests (is currently *implicitly* tested by sensor-applet_spec).
  */
  return {

    on: function(evt, cb) {
      if (!this._ee_listeners) this._ee_listeners = {};
      if (!this._ee_listeners[evt]) this._ee_listeners[evt] = [];

      this._ee_listeners[evt].push(cb);
    },

    emit: function(evt) {
      var args = arguments.length > 1 ? [].splice.call(arguments, 1) : [];

      if (this._ee_listeners && this._ee_listeners[evt]) {
        for (var i = 0, len = this._ee_listeners[evt].length; i < len; i++) {
          this._ee_listeners[evt][i].apply(null, args);
        }
      }
    },

    removeListener: function(evt, listener) {
      if (this._ee_listeners && this._ee_listeners[evt]) {
        for (var i = 0, len = this._ee_listeners[evt].length; i < len; i++) {
          if (this._ee_listeners[evt][i] === listener) {
            this._ee_listeners[evt].splice(i, 1);
          }
        }
      }
    },

    removeListeners: function(evt) {
      if (!evt) {
        this._ee_listeners = {};
      } else {
        if (this._ee_listeners) this._ee_listeners[evt] = [];
      }
    }
  };

});

/*global define: false */
/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   goog.base(this, a, b);
 * }
 *
 * inherit(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.superClass.foo.call(this, a);
 *   // other code
 * };
 *
 * @param {Function} Child Child class.
 * @param {Function} Parent Parent class.
 */
define('common/inherit',[],function() {
  return function inherit(Child, Parent) {
    function F() {}
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.superClass = Parent.prototype;
    Child.prototype.constructor = Child;
  };
});

/*global define: false */

define('sensor-applet/errors',['require','common/inherit'],function(require) {

  var inherit = require('common/inherit');

  function errorConstructor(message) {
    Error.call(this); //super constructor
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor); //super helper method to include stack trace in error object
    }

    this.name = this.constructor.name; //set our function’s name as error name.
    this.message = message; //set the error message
  }

  function JavaLoadError() {
    errorConstructor.apply(this, Array.prototype.slice.apply(arguments));
  }
  inherit(JavaLoadError, Error);

  function AppletInitializationError() {
    errorConstructor.apply(this, Array.prototype.slice.apply(arguments));
  }
  inherit(AppletInitializationError, Error);

  function SensorConnectionError() {
    errorConstructor.apply(this, Array.prototype.slice.apply(arguments));
  }
  inherit(SensorConnectionError, Error);

  function AlreadyReadingError() {
    errorConstructor.apply(this, Array.prototype.slice.apply(arguments));
  }
  inherit(AlreadyReadingError, Error);

  return {
    JavaLoadError: JavaLoadError,
    AppletInitializationError: AppletInitializationError,
    AlreadyReadingError: AlreadyReadingError,
    SensorConnectionError: SensorConnectionError
  };

});

/*global define: false */

define('common/actual-root',[],function () {
  var newPattern = /^(\/.+?\/)(interactives|embeddable)\.html$/,

      // For legacy code, if any, that (a) uses actualRoot and (b) isn't in an interactive
      // (Not folded into the same regex as newPattern for the sake of readability. Note the regexes
      // are only matched against one time.)
      oldPattern = /(\/.+?\/)(doc|examples|experiments)(\/\w+)*?\/\w+\.html/,
      match;

  match = document.location.pathname.match(newPattern);
  if (match && match[1]) {
    return match[1];
  }

  match = document.location.pathname.match(oldPattern);
  return match && match[1] || "/";
});

// this file is generated during build process by: ./script/generate-js-config.rb
define('lab.config',['require','common/actual-root'],function (require) {
  var actualRoot = require('common/actual-root'),
      publicAPI;
  publicAPI = {
  "sharing": true,
  "logging": true,
  "tracing": false,
  "home": "http://lab.ritesproject.net",
  "homeForSharing": null,
  "homeInteractivePath": "/examples/interactives/interactive.html",
  "homeEmbeddablePath": "/examples/interactives/embeddable.html",
  "benchmarkAPIurl": "https://script.google.com/macros/s/AKfycbzosXAVPdVRFUrF6FRI42dzQb2IGLnF9GlIbj9gUpeWpXALKgM/exec",
  "actualRoot": "",
  "utmCampaign": null,
  "fontface": "Lato",
  "hostName": "localhost:9292",
  "authoring": false,
  "environment": "development",
  "static": false
};
  publicAPI.actualRoot = actualRoot;
  return publicAPI;
});

/*global define: false console: true */

define('common/console',['require','lab.config'],function (require) {
  // Dependencies.
  var labConfig = require('lab.config'),

      // Object to be returned.
      publicAPI,
      cons,
      emptyFunction = function () {};

  // Prevent a console.log from blowing things up if we are on a browser that
  // does not support it ... like IE9.
  if (typeof console === 'undefined') {
    console = {};
    if (window) window.console = console;
  }

  // Assign shortcut.
  cons = console;
  // Make sure that every method is defined.
  if (cons.log === undefined)
    cons.log = emptyFunction;
  if (cons.info === undefined)
    cons.info = emptyFunction;
  if (cons.warn === undefined)
    cons.warn = emptyFunction;
  if (cons.error === undefined)
    cons.error = emptyFunction;
  if (cons.time === undefined)
    cons.time = emptyFunction;
  if (cons.timeEnd === undefined)
    cons.timeEnd = emptyFunction;

  // Make sure that every method has access to an 'apply' method
  // This is a hack for IE9 and IE10 when using the built-in developer tools.
  // See: http://stackoverflow.com/questions/5472938/does-ie9-support-console-log-and-is-it-a-real-function
  if (cons.log.apply === undefined)
    cons.log = Function.prototype.bind.call(console.log, console);
  if (cons.info.apply === undefined)
    cons.info = Function.prototype.bind.call(console.info, console);
  if (cons.warn.apply === undefined)
    cons.warn = Function.prototype.bind.call(console.warn, console);
  if (cons.error.apply === undefined)
    cons.error = Function.prototype.bind.call(console.error, console);
  if (cons.time.apply === undefined)
    cons.time = Function.prototype.bind.call(console.time, console);
  if (cons.timeEnd.apply === undefined)
    cons.timeEnd = Function.prototype.bind.call(console.timeEnd, console);

  publicAPI = {
    log: function () {
      if (labConfig.logging)
        cons.log.apply(cons, arguments);
    },
    info: function () {
      if (labConfig.logging)
        cons.info.apply(cons, arguments);
    },
    warn: function () {
      if (labConfig.logging)
        cons.warn.apply(cons, arguments);
    },
    error: function () {
      if (labConfig.logging)
        cons.error.apply(cons, arguments);
    },
    time: function () {
      if (labConfig.tracing)
        cons.time.apply(cons, arguments);
    },
    timeEnd: function () {
      if (labConfig.tracing)
        cons.timeEnd.apply(cons, arguments);
    }
  };

  return publicAPI;
});

/*global define: false $:false */
/*jshint unused: false*/

define('sensor-applet/sensor-applet',['require','common/mini-class','./mini-event-emitter','./errors','common/console'],function(require) {

  var miniClass = require('common/mini-class'),
      EventEmitter = require('./mini-event-emitter'),
      errors = require('./errors'),
      console = require('common/console'),
      SensorApplet;

  function AppletWaiter(){
    var _timer = null,
        _opts = null;

    this.handleCallback = function (){
      console.log("handling callback from applet");
      // this is asynchronous because it will be called by Java
      setTimeout(function (){
        if (_timer === null) {
          console.log("applet called callback after timer expired");
          return;
        }
        window.clearInterval(_timer);
        _timer = null;
        _opts.success();
      }, 5);
    };

    this.wait = function(options){
      var attempts = 0,
          maxAttempts = options.times;

      _opts = options;

      _timer = window.setInterval(function() {
        attempts++;

        if (attempts > maxAttempts) {
          // failure
          window.clearInterval(_timer);
          _timer = null;
          options.fail();
        }
      }, options.interval);
    };
  }

  /**
    events:
      data
      deviceUnplugged
      sensorUnplugged

    states:
      not appended
      test applet appended
      appended
      applet ready
      stopped
      started

    api methods:
      getState          useful for tracking initialization
      append(callback)  initialize applet, checking for Java with test applet
      readSensor        read a single value
      start             start a collection
      stop              stop collection
      remove            remove applet

  */
  SensorApplet = miniClass.defineClass({
    // Before appending the applet, set this value with the path to an object that will receive applet callbacks.
    listenerPath: '',

    // Before appending the applet this should be set to a array of definitions from
    // senor-applet/sensor-definitions.js
    // FIXME: these should be updated to be device independent
    sensorDefinitions: null,

    // Before appending the applet, set this to the path or URL where jars can be found
    codebase: '',

    // supported values are:
    //  "labquest"
    //  "golink"
    deviceType: '',

    appletId:     'sensor-applet',
    classNames:   'applet sensor-applet',

    jarUrls:     ['com/sun/jna/jna.jar',
                  'org/concord/sensor/sensor.jar',
                  'org/concord/sensor/sensor-applets/sensor-applets.jar'],

    deviceSpecificJarUrls: [],

    code:         'org.concord.sensor.applet.SensorApplet',

    testAppletReadyInterval: 100,

    getHTML: function() {
      var allJarUrls = this.jarUrls.concat(this.deviceSpecificJarUrls);

      return [
       '<applet ',
         'id="',       this.appletId,         '" ',
         'class="',    this.classNames,       '" ',
         'archive="',  allJarUrls.join(', '), '" ',
         'code="',     this.code,             '" ',
         'codebase="', this.codebase, '" ',
         'width="1px" ',
         'height="1px" ',
         'MAYSCRIPT="true" ',
       '>',
          '<param name="MAYSCRIPT" value="true" />',
          '<param name="evalOnInit" value="' + this.listenerPath + '.appletIsReadyCallback()" />',
        '</applet>'
      ].join('');
    },

    getTestAppletHTML: function() {
      return [
       '<applet ',
         'id="',       this.appletId,         '-test-applet" ',
         'class="applet test-sensor-applet" ',
         'code="org.concord.sensor.applet.DetectionApplet" ',
         'archive="org/concord/sensor/sensor-applets/sensor-applets.jar"',
         'codebase="', this.codebase, '" ',
         'width="150px" ',
         'height="150px" ',
         'style="position: absolute; ',
                'left: ' + ($('body').width() / 2 - 75) +'px; ',
                'top: ' + ($('body').height() / 2 - 75) +'px;" ',
         'MAYSCRIPT="true" ',
       '>',
          '<param name="MAYSCRIPT" value="true" />',
          '<param name="evalOnInit" value="' + this.listenerPath + '.testAppletIsReadyCallback()" />',
        '</applet>'
      ].join('');
    },

    /**
      Passes true to the callback if the correct device type is connected.
    */
    isSensorConnected: function(callback) {
      var self = this, nextCallback, nextCallbackIdx;
      setTimeout(function() {
        nextCallback = function(connected) {
          // Note this appears only to return a meaningful result when first called. After that, it
          // returns the same value for a given deviceType, even if the device has been unplugged from
          // the USB port.
          if(!connected) {
            callback.call(self, false);
          } else {
            nextCallback = function() {
              var attachedSensors = self.appletInstance.getCachedAttachedSensors();
              if (attachedSensors) {
                // FIXME we should use the applet configure method to check if the right sensors are attached
                // instead of doing this comparison here
                // For now this is skipped if there is more than one sensorDefinition
                if(self.sensorDefinitions.length === 1) {
                  for (var i = 0; i < attachedSensors.length; i++) {
                    if (self.appletInstance.getTypeConstantName(attachedSensors[i].getType()) ===
                          self.sensorDefinitions[0].typeConstantName) {
                      callback.call(self, true);
                      return;
                    }
                  }
                  callback.call(self, false);
                } else {
                  callback.call(self, true);
                }
              } else {
                callback.call(self, false);
              }
            };
            nextCallbackIdx = self.registerCallback(nextCallback);
            self.appletInstance.getAttachedSensors(self.deviceType, ""+nextCallbackIdx);
          }
        };
        nextCallbackIdx = self.registerCallback(nextCallback);
        self.appletInstance.isInterfaceConnected(self.deviceType, ""+nextCallbackIdx);
      });
    },

    _state: 'not appended',

    getState: function() {
      return this._state;
    },

    /**
      Append the applet to the DOM, and call callback when either:

        (1) The applet is configured and ready, with the correct device attached (it is ready to
            start collecting data immediately). The SensorApplet instance will be in the 'stopped'
            state.

        or:

        (2) An error occurs in the initialization process. An error object will be passed as the
            first argument to the callback (Node.js style).

        Currently, we detect three kinds of errors:

          * The Java plugin does not appear to be working (we time out waiting for a callback from
            our test applet). In this case, application code may want to remove the applet and try
            calling 'append' again later.

          * The sensor applet was appended, but never initializes (we time out waiting for a callback
            from the sensor applet).  In this case, application code may want to remove the applet
            and try calling 'append' again later.

          * The sensor applet reports that the wrong sensor type is attached. In this case,
            the applet is known to be loaded, and the application code may want to notify the user,
            and call 'initializeSensor' when the user indicates the sensor is plugged in. If
            If the callback is called with a null argument, the applet is ready to collect data.
    */
    append: function($loadingParent, callback) {
      if (this.getState() !== 'not appended') {
        throw new Error("Can't call append() when sensor applet has left 'not appended' state");
      }
      console.log("appending test applet");
      this.$testAppletContainer = this._appendHTML(this.appletId + "-test-applet-container",
                                                   this.getTestAppletHTML(),
                                                   $loadingParent);
      this._state = 'test applet appended';
      this._waitForTestApplet();
      this._appendCallback = callback;
    },

    _appendHTML: function(containerId, html, $parent) {
      var appletContainer = $('#' + containerId );

      if(!appletContainer.length){
        appletContainer = $("<div id='" + containerId + "'/>").appendTo($parent);
      }

      // using .append() actually creates some sort of internal reference to the applet,
      // which can cause problems calling applet methods later. Using .html() seems to avoid this.
      appletContainer.html(html);
      return appletContainer;
    },

    _testAppletWaiter: new AppletWaiter(),
    // this will be called by the test applet once it is initialized
    testAppletIsReadyCallback: function () {
      this._testAppletWaiter.handleCallback();
    },

    _waitForTestApplet: function() {
      var self = this;
      this._testAppletWaiter.wait({
        times: 30,
        interval: 1000,
        success: function() {
          self.$appletContainer = self._appendHTML(self.appletId + "-container",
                                                   self.getHTML(),
                                                   $('body'));
          self._state = 'appended';
          self._waitForApplet();
        },
        fail: function () {
          self._appendCallback(new errors.JavaLoadError("Timed out waiting for test applet to initialize."));
        }
      });
    },

    _appletWaiter: new AppletWaiter(),
    // this will be called by the applet once it is initialized
    appletIsReadyCallback: function () {
      this._appletWaiter.handleCallback();
    },

    _waitForApplet: function() {
      var self = this;
      this._appletWaiter.wait({
        times: 30,
        interval: 1000,
        success: function() {
          var requests = [];
          // remove test applet
          self.$testAppletContainer.html("");
          if (self.getState() === 'appended') {
            self._state = 'applet ready';
          }

          self.appletInstance = $('#'+self.appletId)[0];

          for(var i=0; i<self.sensorDefinitions.length; i++){
            // Get a SensorRequest object for this measurement type
            requests[i] =
              self.appletInstance.getSensorRequest(self.sensorDefinitions[i].measurementType);
          }

          // Try to initialize the sensor for the correct device and measurement type (e.g., goio,
          // distance). Java will callback to initSensorInterfaceComplete on success or error.
          self.appletInstance.initSensorInterface(self.listenerPath, self.deviceType, requests);
        },
        fail: function () {
          self._appendCallback(new errors.AppletInitializationError("Timed out waiting for sensor applet to initialize."));
        }
      });
    },

    // callback: function(error, values) {}
    readSensor: function(callback) {
      var self = this;
      if (this.getState() === 'reading sensor') {
        console.log("Already reading sensor in another thread...");
        callback.call(this, new errors.AlreadyReadingError("Already reading sensor in another thread"), null);
        return;
      }

      if (this.getState() !== 'stopped') {
        callback.call(this, new Error("Tried to read the sensor value from non-stopped state '" + this.getState() + '"'), null);
        return;
      }

      // because of IE multi threading applet behavior we need to track our state before calling
      // the applet
      this._state = 'reading sensor';
      this.isSensorConnected(function(connected) {
        if (connected) {
          var valuesCallback = function(values) {
            self._state = 'stopped';
            if (!values || values.length === 0) {
              callback.call(self, new Error("readSensor: no sensor values to report"), null);
            } else {
              callback.call(self, null, values);
            }
          };
          var callbackIdx = self.registerCallback(valuesCallback);
          self.appletInstance.getConfiguredSensorsValues(self.deviceType, ""+callbackIdx);
        } else {
          self._state = 'stopped';
          callback.call(self, new errors.SensorConnectionError("readSensor: sensor is not connected"), null);
        }
      });
    },

    // callback: function(error, isStarted) {}
    start: function(callback) {
      var self = this;
      if (this.getState() === 'reading sensor') {
        console.log("start called while waiting for a sensor reading");

        // because of IE multi threading we might we waiting for a reading from the sensor still
        // so we try waiting for little while before giving up

        // this will cause a infinite loop of the applet blocks forever
        // however that is what happens in normal browsers anyhow
        setTimeout(function(){
          self.start(callback);
        }, 100);
        return;
      }

      if (this.getState() !== 'stopped') {
        if (callback) {
          setTimeout(function(){
            callback.call(this, new Error("Tried to start the applet from non-stopped state '" + this.getState() + '"'), false);
          }, 5);
        }
        return;
      }
      // in IE a slow call to an applet will result in other javascript being executed while waiting
      // for the applet. So we need to keep track of our state before calling Java.
      this._state = 'starting';

      // Remain in state 'stopped' if sensor is not connected. This is because we want the user to
      // be able to click 'start' again after plugging in the sensor. Changing to a different state
      // would require having some way to detect when to leave that state. We lack a way to
      // automatically detect that the sensor has been plugged in, and we don't want to force the
      // user to tell us.
      this.isSensorConnected(function(connected) {
        if (!connected) {
          self._state = 'stopped';
          if (callback) {
            callback.call(self, new errors.SensorConnectionError("Device reported the requested sensor type was not attached."), null);
          }
        } else {
          self.appletInstance.startCollecting();
          self._state = 'started';
          if (callback) {
            callback.call(self, null, true);
          }
        }
      });
    },

    stop: function() {
      if (this.getState() === 'started') {
        this._state = 'stopped';
        this.appletInstance.stopCollecting();
      }
    },

    remove: function() {
      if (this.getState() !== 'not appended') {
        if (this.$appletContainer) {
          this.$appletContainer.html("");
        }
        if (this.$testAppletContainer) {
          this.$testAppletContainer.html("");
        }
        this._state = 'not appended';
      }
    },

    // applet callbacks
    // we don't want to block the applet and we don't want to execute any code
    // in the callback thread because things can break if javascript calls back to Java in
    // a callback
    initSensorInterfaceComplete: function(success) {
      var self = this;
      setTimeout(function() {
        if(success){
          self._state = 'stopped';
          self._appendCallback(null);
          self._appendCallback = null;
        } else {
          // state should remain 'applet ready'
          self._appendCallback(new errors.SensorConnectionError("Device reported the requested sensor type was not attached."));
        }
      }, 5);
    },

    dataReceived: function(type, count, data) {
      var self = this,
          // FIXME this is inefficient to make a new object each time
          dataSample = [],
          numberOfSensors = this.sensorDefinitions.length;
      setTimeout(function () {
        data = data || [];
        for (var sampleIndex = 0; sampleIndex < count; sampleIndex++) {
          for (var i = 0; i < numberOfSensors; i++) {
            dataSample[i] = data[sampleIndex*numberOfSensors + i];
            self.emit('data', dataSample);
          }
        }
      }, 5);
    },

    deviceUnplugged: function() {
      var self = this;
      window.setTimeout(function() {
        self.emit('deviceUnplugged');
      }, 5);
    },

    sensorUnplugged: function() {
      var self = this;
      console.log("received sensorUnplugged message; deviceType = " + this.deviceType);
      // the model code is not currently handle this callback correctly
      return;

      window.setTimeout(function() {
        self.emit('sensorUnplugged');
      }, 10);
    },

    callbackTable: [],
    registerCallback: function(callback) {
      // TODO We might want to set up a "reaper" function to error the callback if a certain
      // amount of time passes and the callback hasn't been called.
      this.callbackTable.push(callback);
      return this.callbackTable.length-1;
    },

    handleCallback: function(index, value) {
      var callback, self = this;
      if (typeof(index) === "string" && this[index]) {
        // assume this is meant to call a direct method on this class instance
        callback = this[index];
      } else if (this.callbackTable[index]) {
        callback = this.callbackTable[index];
        this.callbackTable[index] = null;
      }

      if (callback) {
        setTimeout(function() {
          callback.apply(self, value);
        }, 5);
      }
    }
  });

  miniClass.mixin(SensorApplet.prototype, EventEmitter);

  return SensorApplet;
});

/*global define: false*/

define('sensor-applet/applet-classes',['require','common/mini-class','./sensor-applet'],function(require) {

  var miniClass           = require('common/mini-class'),
      SensorApplet = require('./sensor-applet');

  return {
    goio: miniClass.extendClass(SensorApplet, {
      deviceType:            'golink',
      deviceSpecificJarUrls: [
        'org/concord/sensor/sensor-vernier/sensor-vernier.jar',
        'org/concord/sensor/goio-jna/goio-jna.jar']
    }),

    labquest: miniClass.extendClass(SensorApplet, {
      deviceType:            'labquest',
      deviceSpecificJarUrls: [
        'org/concord/sensor/sensor-vernier/sensor-vernier.jar',
        'org/concord/sensor/labquest-jna/labquest-jna.jar']
    })
  };
});

/*global define: false*/

define('sensor-applet/sensor-definitions',[],function() {
  return {
    goMotion: {
      appletClass: 'goio',

      // Name of the measurement being made, for display in UI
      measurementName: "Distance",

      // measurement type, as accepted by applet's getSensorRequest method
      measurementType: 'distance',

      // measurement type, as returned by getTypeConstantName method.
      // The returned values are taken from the QUANTITY_* constants in the sensor project
      // See https://github.com/concord-consortium/sensor/blob/2da0693e4d92d8c107be802f29eab2688a83b26b/src/main/java/org/concord/sensor/SensorConfig.java
      typeConstantName: 'distance',

      // fully specified, readable name of the sensor: e.g., "GoIO pH Sensor"
      sensorName: "GoMotion",

      // readable name of the interface device the sensor connects to, e..g, "GoIO"
      deviceName: "GoMotion",

      samplesPerSecond: 20,
      tareable: true,
      minReading: 0,
      maxReading: 4,
      precision: 2,
      maxSeconds: 20
    },

    goLinkTemperature: {
      appletClass: 'goio',
      measurementName: "Temperature",
      measurementType: 'temperature',
      // QUANTITY_TEMPERATURE
      typeConstantName: 'temperature',
      sensorName: "GoIO Temperature Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 10,
      tareable: false,
      minReading: 0,
      maxReading: 40,
      maxSeconds: 20
    },

    goLinkLight: {
      appletClass: 'goio',
      measurementName: "Light Intensity",
      measurementType: 'light',
      // QUANTITY_LIGHT
      typeConstantName: 'light',
      sensorName: "GoIO Light Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 10,
      tareable: false,
      minReading: 0,
      maxReading: 2000,
      maxSeconds: 20
    },

    goLinkForce: {
      appletClass: 'goio',
      measurementName: "Force",
      measurementType: 'force',
      // QUANTITY_FORCE
      typeConstantName: 'force',
      sensorName: "GoIO Force Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 20,
      tareable: true,
      minReading: -50,
      maxReading: 50,
      precision: 2,
      maxSeconds: 10
    },

    goLinkPH: {
      appletClass: 'goio',
      measurementName: "Acidity",
      measurementType: 'ph',
      // QUANTITY_PH
      typeConstantName: 'ph',
      sensorName: "GoIO pH Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 10,
      tareable: false,
      minReading: 0,
      maxReading: 14,
      maxSeconds: 60
    },

    goLinkCO2: {
      appletClass: 'goio',
      measurementName: "CO₂ Concentration",
      measurementType: 'co2',
      // QUANTITY_CO2_GAS
      typeConstantName: 'co2_gas',
      sensorName: "GoIO CO₂ sensor",
      deviceName: "GoIO",
      samplesPerSecond: 1,
      tareable: false,
      minReading: 0,
      maxReading: 5000,
      maxSeconds: 60
    },

    goLinkO2: {
      appletClass: 'goio',
      measurementName: "O₂ Concentration",
      measurementType: 'o2',
      // QUANTITY_OXYGEN_GAS
      typeConstantName: 'oxygen_gas',
      sensorName: "GoIO O₂ sensor",
      deviceName: "GoIO",
      samplesPerSecond: 1,
      tareable: false,
      minReading: 0,
      maxReading: 100,
      maxSeconds: 60
    },

    labQuestMotion: {
      appletClass: 'labquest',
      measurementName: "Distance",
      measurementType: 'distance',
      // QUANTITY_DISTANCE
      typeConstantName: 'distance',
      sensorName: "LabQuest Motion Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 20,
      tareable: true,
      minReading: 0,
      maxReading: 4,
      precision: 2,
      maxSeconds: 20
    },

    labQuestTemperature: {
      appletClass: 'labquest',
      measurementName: "Temperature",
      measurementType: 'temperature',
      // QUANTITY_TEMPERATURE
      typeConstantName: 'temperature',
      sensorName: "LabQuest Temperature Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 10,
      tareable: false,
      minReading: 0,
      maxReading: 40,
      maxSeconds: 20
    },

    labQuestLight: {
      appletClass: 'labquest',
      measurementName: "Light Intensity",
      measurementType: 'light',
      // QUANTITY_LIGHT
      typeConstantName: 'light',
      sensorName: "LabQuest Light Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 10,
      tareable: false,
      minReading: 0,
      maxReading: 2000,
      maxSeconds: 20
    },

    labQuestForce: {
      appletClass: 'labquest',
      measurementName: "Force",
      measurementType: 'force',
      // QUANTITY_FORCE
      typeConstantName: 'force',
      sensorName: "LabQuest Force Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 20,
      tareable: true,
      minReading: -50,
      maxReading: 50,
      precision: 2,
      maxSeconds: 10
    },

    labQuestPH: {
      appletClass: 'labquest',
      measurementName: "Acidity",
      measurementType: 'ph',
      // QUANTITY_PH
      typeConstantName: 'ph',
      sensorName: "LabQuest pH Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 10,
      tareable: false,
      minReading: 0,
      maxReading: 14,
      maxSeconds: 60
    },

    labQuestCO2: {
      appletClass: 'labquest',
      measurementName: "CO₂ Concentration",
      measurementType: 'co2',
      // QUANTITY_CO2_GAS
      typeConstantName: 'co2_gas',
      sensorName: "LabQuest CO₂ sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 1,
      tareable: false,
      minReading: 0,
      maxReading: 5000,
      maxSeconds: 60
    },

    labQuestO2: {
      appletClass: 'labquest',
      measurementName: "O₂ Concentration",
      measurementType: 'o2',
      // QUANTITY_OXYGEN_GAS
      typeConstantName: 'oxygen_gas',
      sensorName: "LabQuest O₂ sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 1,
      tareable: false,
      minReading: 0,
      maxReading: 100,
      maxSeconds: 60
    }
  };
});

/*global define: false*/

// The keys are taken from the values of the 'measurementType' property
// of the elements of ./sensor-definitions

define('sensor-applet/units-definition',[],function() {
  return {
    units: {
      time: {
        name: "second",
        pluralName: "seconds",
        symbol: "s"
      },
      distance: {
        name: "meter",
        pluralName: "meters",
        symbol: "m"
      },
      temperature: {
        name: "degree Celsius",
        pluaralName: "degrees Celsius",
        symbol: "°C"
      },
      light: {
        name: "lux",
        pluralName: "lux",
        symbol: "lux"
      },
      force: {
        name: "Newton",
        pluralName: "Newtons",
        symbol: "N"
      },
      ph: {
        name: "pH Unit",
        pluralName: "pH Units",
        symbol: "pH"
      },
      co2: {
        name: "part per million",
        pluralName: "parts per million",
        symbol: "ppm"
      },
      o2: {
        name: "part per million",
        pluralName: "parts per million",
        symbol: "ppm"
      }
    }
  };
});

/*global define: false, window: false */

define('sensor-applet/public-api',['require','sensor-applet/applet-classes','sensor-applet/errors','sensor-applet/sensor-definitions','sensor-applet/units-definition'],function (require) {
  'use strict';

  window.Lab = window.Lab || {};

  var appletClasses = require('sensor-applet/applet-classes'),
      errors        = require('sensor-applet/errors');

  return window.Lab.sensorApplet = {
    version: "1.0.0",
    // ==========================================================================
    // Functions and modules which should belong to this API:

    // Classes used to work with the sensors
    GoIO:                      appletClasses.goio,
    LabQuest:                  appletClasses.labquest,

    // Listing of supported sensors, you need to set the measurementType on a
    // SensorApplet instance before calling append. The keys of the sensorDefinitions
    // map are the supported measurementType values.
    sensorDefinitions:         require('sensor-applet/sensor-definitions'),
    unitsDefinition:           require('sensor-applet/units-definition'),

    // Error Classes. These are returned to appendCallback or thrown by some of
    // the API methods.
    JavaLoadError:             errors.JavaLoadError,
    AppletInitializationError: errors.AppletInitializationError,
    SensorConnectionError:     errors.SensorConnectionError
    // ==========================================================================
  };
});
require(['sensor-applet/public-api'], undefined, undefined, true); }());