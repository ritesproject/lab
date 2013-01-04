helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

describe "PairwiseLJProperties", ->
  requirejs [
    'cs!md2d/models/engine/pairwise-lj-properties',
    'md2d/models/modeler'
    ], (PairwiseLJProperties, Model) ->

    describe "[basic tests of the class]", ->
      # Mock the engine. LJProps structure depends only on one function of the engine.
      engine =
        setPairwiseLJProperties: ->

      # Mock the change hooks.
      changeHooks =
        pre: ->
        post: ->

      beforeEach ->
        sinon.spy engine, "setPairwiseLJProperties"
        sinon.spy changeHooks, "pre"
        sinon.spy changeHooks, "post"

      afterEach ->
        engine.setPairwiseLJProperties.restore()
        changeHooks.pre.restore()
        changeHooks.post.restore()

      describe "PairwiseLJProperties constructor", ->
        it "should exist", ->
          should.exist PairwiseLJProperties

        it "should act as a constructor that accepts the engine object", ->
          ljPropsCollection = new PairwiseLJProperties engine
          should.exist ljPropsCollection

      describe "PairwiseLJProperties instance", ->
        ljPropsCollection = null

        before ->
          ljPropsCollection = new PairwiseLJProperties engine

        it "should have a registerChangeHooks, add, set, get and count methods", ->
          ljPropsCollection.should.have.property "registerChangeHooks"
          ljPropsCollection.should.have.property "set"
          ljPropsCollection.should.have.property "get"
          ljPropsCollection.should.have.property "remove"

        it "should return undefined when custom properties are not specified for pair", ->
          should.not.exist ljPropsCollection.get(0, 1)

        describe "without registered change hooks", ->
          it "should throw when the set method is called", ->
            (-> ljPropsCollection.set 0, 1, {sigma: 2, epsilon: 3}).should.throw()

        describe "with registered change hooks", ->

          beforeEach ->
            ljPropsCollection.registerChangeHooks changeHooks.pre, changeHooks.post

          it "should allow to set custom properties and call appropriate hooks and engine methods", ->
            ljPropsCollection.set 0, 1, {sigma: 2, epsilon: 3}
            changeHooks.pre.callCount.should.eql 1
            changeHooks.post.callCount.should.eql 1
            engine.setPairwiseLJProperties.callCount.should.eql 1
            engine.setPairwiseLJProperties.withArgs(0, 1).calledOnce.should.be.true

            ljPropsCollection.set 4, 5, {sigma: 6, epsilon: 7}
            changeHooks.pre.callCount.should.eql 2
            changeHooks.post.callCount.should.eql 2
            engine.setPairwiseLJProperties.callCount.should.eql 2
            engine.setPairwiseLJProperties.withArgs(4, 5).calledOnce.should.be.true

          it "should allow to get existing LJ properties", ->
            ljPropsCollection.get(0, 1).should.eql sigma: 2, epsilon: 3
            ljPropsCollection.get(4, 5).should.eql sigma: 6, epsilon: 7

          it "should allow to modify existing custom LJ properties and call appropriate hooks and engine methods", ->
            ljPropsCollection.set 0, 1, {sigma: 10, epsilon: 11}
            changeHooks.pre.callCount.should.eql 1
            changeHooks.post.callCount.should.eql 1
            engine.setPairwiseLJProperties.callCount.should.eql 1
            engine.setPairwiseLJProperties.withArgs(0, 1).calledOnce.should.be.true

            ljPropsCollection.get(0, 1).should.eql sigma: 10, epsilon: 11

          it "should allow to remove custom LJ properties and call appropriate hooks and engine methods", ->
            ljPropsCollection.remove 4, 5
            changeHooks.pre.callCount.should.eql 1
            changeHooks.post.callCount.should.eql 1
            engine.setPairwiseLJProperties.callCount.should.eql 1
            engine.setPairwiseLJProperties.withArgs(4, 5).calledOnce.should.be.true

            should.not.exist(ljPropsCollection.get(4, 5))

          it "should allow to deserialize custom properties stored in an array", ->
            data = [
              {element1: 1, element2: 2, sigma: 1, epsilon: 2}
              {element1: 2, element2: 3, sigma: 2, epsilon: 3}
            ]

            ljPropsCollection.deserialize data
            ljPropsCollection.get(1, 2).should.eql sigma: 1, epsilon: 2
            ljPropsCollection.get(2, 3).should.eql sigma: 2, epsilon: 3


    describe "[tests in the MD2D modeler context]", ->

      describe "PairwiseLJProperties instance", ->
        it "should be initialized by the modeler", ->
          # Use {} as an empty model definition. Default values will be used.
          model = new Model {}
          should.exist model.getPairwiseLJProperties()
          model.getPairwiseLJProperties().should.be.an.instanceOf PairwiseLJProperties

        it "should be filled with initial properties if they are defined in model JSON", ->
          model = new Model
            pairwiseLJProperties: [
              { element1: 0, element2: 1, sigma: 2, epsilon: 3},
              { element1: 2, element2: 3, sigma: 4, epsilon: 5}
            ]
          ljPropsCollection = model.getPairwiseLJProperties()
          ljPropsCollection.get(0, 1).should.eql sigma: 2, epsilon: 3
          ljPropsCollection.get(2, 3).should.eql sigma: 4, epsilon: 5
