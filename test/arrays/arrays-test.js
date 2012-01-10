require("../env");
require("../../lab.arrays");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("molecules_arrays.create");

suite.addBatch({
  "create": {
    topic: function() {
      return molecules_arrays.create;
    },
    "creates array of zeros": function(create) {
      assert.deepEqual(create(4, 0), [0, 0, 0, 0]);
    },
    "creates array of ones": function(create) {
      assert.deepEqual(create(4, 1), [1, 1, 1, 1]);
    }
  }
});

suite.addBatch({
  "copy": {
    topic: function() {
      return molecules_arrays.copy;
    },
    "copies array of zeros": function(copy) {
      var src  = [0, 0, 0, 0];
      var dest = [];
      copy(src, dest);
      assert.deepEqual(src, dest);
    },
    "copies array of ones": function(copy) {
      var src = [1, 1, 1, 1];
      var dest = [];
      copy(src, dest);
      assert.deepEqual(src, dest);
    }
  }
});

suite.addBatch({
  "clone": {
    topic: function() {
      return molecules_arrays.clone;
    },
    "clones array of zeros": function(clone) {
      var src  = [0, 0, 0, 0];
      var dest = clone(src);
      assert.deepEqual(src, dest);
    },
    "clones array of ones": function(clone) {
      var src = [1, 1, 1, 1];
      var dest = clone(src);
      assert.deepEqual(src, dest);
    }
  }
});

suite.addBatch({
  "between": {
    topic: function() {
      return molecules_arrays.between;
    },
    "3 is betwen 2 and 4": function(between) {
      assert.equal(between(2, 4, 3), true);
    },
    "1 is not between 2 and 4": function(between) {
      assert.equal(between(2, 4, 1), false);
    },
    "2 is not between 2 and 4": function(between) {
      assert.equal(between(2, 4, 2), false);
    },
    "4 is not between 2 and 4": function(between) {
      assert.equal(between(2, 4, 4), false);
    },
    "5 is not between 2 and 4": function(between) {
      assert.equal(between(2, 4, 5), false);
    }
  }
});

suite.addBatch({
  "max": {
    topic: function() {
      return molecules_arrays.max;
    },
    "find max in simple array": function(max) {
      assert.equal(max([0, 1, 2, 3]), 3);
    },
    "find max in array with duplicate max values": function(max) {
      assert.equal(max([3, 0, 1, 2, 3]), 3);
    },
    "find max in array with negative and positive numbers": function(max) {
      assert.equal(max([3, -1, 0, 1, 2, 3]), 3);
    },
    "find max in array of all negative numbers": function(max) {
      assert.equal(max([-8, -7, -4, -3]), -3);
    }
  }
});

suite.addBatch({
  "min": {
    topic: function() {
      return molecules_arrays.min;
    },
    "find min in simple array": function(min) {
      assert.equal(min([0, 1, 2, 3]), 0);
    },
    "find min in array with duplicate min values": function(min) {
      assert.equal(min([3, 0, 1, 2, 0]), 0);
    },
    "find min in array with negative and positive numbers": function(min) {
      assert.equal(min([3, -1, 0, 1, 2, 3]), -1);
    },
    "find min in array of all negative numbers": function(min) {
      assert.equal(min([-8, -7, -4, -3]), -8);
    }
  }
});

suite.addBatch({
  "mmaxAnyArrayax": {
    topic: function() {
      return molecules_arrays.maxAnyArray;
    },
    "find max in any array type in simple array": function(maxAnyArray) {
      assert.equal(maxAnyArray([0, 1, 2, 3]), 3);
    },
    "find max in any array type with duplicate max values": function(maxAnyArray) {
      assert.equal(maxAnyArray([3, 0, 1, 2, 3]), 3);
    },
    "find max in any array type with negative and positive numbers": function(maxAnyArray) {
      assert.equal(maxAnyArray([3, -1, 0, 1, 2, 3]), 3);
    },
    "find max in any array type of all negative numbers": function(maxAnyArray) {
      assert.equal(maxAnyArray([-8, -7, -4, -3]), -3);
    }
  }
});

suite.addBatch({
  "minAnyArray": {
    topic: function() {
      return molecules_arrays.minAnyArray;
    },
    "find min in any array type in simple array": function(minAnyArray) {
      assert.equal(minAnyArray([0, 1, 2, 3]), 0);
    },
    "find min in any array type with duplicate min values": function(minAnyArray) {
      assert.equal(minAnyArray([3, 0, 1, 2, 0]), 0);
    },
    "find min in any array type with negative and positive numbers": function(minAnyArray) {
      assert.equal(minAnyArray([3, -1, 0, 1, 2, 3]), -1);
    },
    "find min in any array type of all negative numbers": function(minAnyArray) {
      assert.equal(minAnyArray([-8, -7, -4, -3]), -8);
    }
  }
});

suite.addBatch({
  "average": {
    topic: function() {
      return molecules_arrays.average;
    },
    "find average in in simple array": function(average) {
      assert.equal(average([0, 1, 2, 3]), 1.5);
    },
    "find average in any array type with duplicate min values": function(average) {
      assert.equal(average([3, 0, 1, 2, 0]), 1.2);
    }
  }
});

suite.export(module);
