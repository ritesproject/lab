/*global define: false, $ */

define(function(require) {

  var arrays = require('arrays'),

      infinityToString = function (obj) {
        var i, len;
        if (arrays.isArray(obj)) {
          for (i = 0, len = obj.length; i < len; i++) {
            if (obj[i] === Infinity || obj[i] === -Infinity) {
              obj[i] = obj[i].toString();
            }
          }
        } else {
          for (i in obj) {
            if (obj.hasOwnProperty(i)) {
              if (obj[i] === Infinity || obj[i] === -Infinity) {
                obj[i] = obj[i].toString();
              }
              if (typeof obj[i] === 'object' || arrays.isArray(obj[i])) {
                infinityToString(obj[i]);
              }
            }
          }
        }
      };

  return function serialize(metaData, propertiesHash, count) {
    var result = {}, propName, prop;
    for (propName in metaData) {
      if (metaData.hasOwnProperty(propName)) {
        if (propertiesHash[propName] !== undefined && metaData[propName].serialize !== false) {
          prop = propertiesHash[propName];
          if (arrays.isArray(prop)) {
            result[propName] = count !== undefined ? arrays.copy(arrays.extend(prop, count), []) : arrays.copy(prop, []);
          }
          else if (typeof prop === 'object') {
            result[propName] = $.extend(true, {}, prop);
          }
          else {
            result[propName] = prop;
          }
        }
      }
    }
    // JSON doesn't allow Infinity values so convert them to strings.
    infinityToString(result);
    return result;
  };

});
