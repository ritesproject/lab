/*global define, $*/

define(function (require) {
  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator'),
      Dataset   = require('common/models/dataset'),
      experimentControllerCount = 0;

  return function ExperimentController(experimentDefinition, interactivesController, onLoadScripts) {
        // Public API.
    var controller,
        model,
        scriptingAPI,
        timeSeriesDatasets,
        currentDataset,
        timeSeries,
        inputs,
        outputs,
        destinations,
        stateButtons,
        onResetScript,
        onResetFunc,
        onLoadFunc,
        // the state transition button components
        startRun,
        stopRun,
        saveRun,
        nextRun,
        clearAll,
        // arrays of components (graphs or tables) that data are sent to ...
        timeSeriesDestinations,
        parameterSeriesDestinations,
        timeSeriesGraph,

        namespace = "experimentController" + (++experimentControllerCount);

    function initialize() {
      scriptingAPI = interactivesController.getScriptingAPI();
      model = interactivesController.getModel();
      // Validate component definition, use validated copy of the properties.
      experimentDefinition = validator.validateCompleteness(metadata.experiment, experimentDefinition);
      timeSeries    = experimentDefinition.timeSeries;
      inputs        = experimentDefinition.parameters.inputs;
      outputs       = experimentDefinition.parameters.outputs;
      destinations  = experimentDefinition.destinations;
      stateButtons  = experimentDefinition.stateButtons;
      onResetScript = experimentDefinition.onReset;
      if (onLoadScripts.length > 0) {
        onLoadFunc  = onLoadScripts[0];
      }
      timeSeriesDatasets = [];
    }

    function setup() {

      // private functions ...
      function setupStateButtons() {
        startRun = interactivesController.getComponent(stateButtons.startRun);
        stopRun  = interactivesController.getComponent(stateButtons.stopRun);
        saveRun  = interactivesController.getComponent(stateButtons.saveRun);
        nextRun  = interactivesController.getComponent(stateButtons.nextRun);
        clearAll = interactivesController.getComponent(stateButtons.clearAll);
      }

      function setupDestinationComponents() {
        var i, j, destination, component;
        timeSeriesDestinations = [];
        parameterSeriesDestinations = [];
        for (i = 0; i < destinations.length; i++) {
          destination = destinations[i];
          destination.components = [];
          for (j = 0; j < destination.componentIds.length; j++) {
            destination.components.push(interactivesController.getComponent(destination.componentIds[j]));
          }
          switch (destination.type) {
          case "timeSeries":
            timeSeriesDestinations.push(destination);
            break;
          case "parameterSeries":
            parameterSeriesDestinations.push(destination);
            break;
          default:
            throw new Error("Experiment destination: invalid destination type: " + destination.type);
          }
        }
        timeSeriesGraph = undefined;
        for (i = 0; i < timeSeriesDestinations.length; i++) {
          destination = timeSeriesDestinations[i];
          for (j = 0; j < destination.components.length; j++) {
            component = destination.components[j];
            if (component.type !== undefined && component.type === "graph") {
              timeSeriesGraph = component;
              return;
            }
          }
        }
      }

      function setupModelParameters() {
        model.defineParameter('experimentCleared', { initialValue: false }, function () {
          if (model.get('experimentCleared')) {
            goToNextRun();
            model.set('experimentCleared', false);
          }
        });
        model.defineParameter('experimentRunning', { initialValue: false }, function () {
          if (model.get('experimentRunning')) {
            goToRunStarted();
          } else {
            goToRunStopped();
          }
        });
      }

      function setupStateButtonActions() {
        startRun.setAction("set('experimentRunning', true);");
        stopRun.setAction("set('experimentRunning', false);");
        saveRun.setAction(function () {
          var i, j, parameterSeriesDestination;
          timeSeriesDatasets.push(currentDataset);
          for (i = 0; i < parameterSeriesDestinations.length; i++) {
            parameterSeriesDestination = parameterSeriesDestinations[i];
            for (j = 0; j < parameterSeriesDestination.components.length; j++) {
              parameterSeriesDestination.components[j].appendDataPropertiesToComponent();
            }
          }
          saveRun.setDisabled(true);
        });
        nextRun.setAction("set('experimentCleared', true);");
        clearAll.setAction("reload();");
      }

      // setup experiment ...
      setupStateButtons();
      setupDestinationComponents();
      setupModelParameters();
      setupStateButtonActions();
      goToReloadedState();
      if (onResetScript) {
        onResetFunc = scriptingAPI.makeFunctionInScriptContext(onResetScript);
      }
    }

    function addOlderRunsToGraph() {
      var i;
      if (timeSeriesGraph) {
        for (i = 0; i < timeSeriesDatasets.length; i++) {
          timeSeriesGraph.addDataSet(timeSeriesDatasets[i].getData());
        }
        timeSeriesGraph.update();
      }
    }

    function unfreezeInputParameters() {
      for (var i = 0; i < inputs.length; i++) {
        model.unfreeze(inputs[i]);
      }
    }


    function freezeInputParameters() {
      for (var i = 0; i < inputs.length; i++) {
        model.freeze(inputs[i]);
      }
    }

    // transition to reloaded state
    function goToReloadedState() {
      startRun.setDisabled(false);
      stopRun.setDisabled(true);
      saveRun.setDisabled(true);
      nextRun.setDisabled(true);
      clearAll.setDisabled(true);
      timeSeriesDatasets = [];
      if (timeSeriesGraph) {
        timeSeriesGraph.clearDataSets();
      }
      unfreezeInputParameters();
    }

    function goToRunStarted() {
      startRun.setDisabled(true);
      stopRun.setDisabled(false);
      saveRun.setDisabled(true);
      nextRun.setDisabled(true);
      clearAll.setDisabled(false);
      freezeInputParameters();
      currentDataset = new Dataset({ timeSeries: timeSeries }, model);
      scriptingAPI.api.start();
    }

    function goToRunStopped() {
      startRun.setDisabled(true);
      stopRun.setDisabled(true);
      saveRun.setDisabled(false);
      nextRun.setDisabled(false);
      scriptingAPI.api.stop();
    }

    function goToNextRun() {
      startRun.setDisabled(false);
      stopRun.setDisabled(true);
      saveRun.setDisabled(true);
      nextRun.setDisabled(true);
      model.set('experimentCleared', false);
      interactivesController.resetModel({retainParameters: inputs});
      unfreezeInputParameters();
      if (onResetFunc) {
        onLoadFunc.apply(onResetFunc, null);
      }
      addOlderRunsToGraph();
    }

    function registerModelListeners() {
      // Namespace listeners to '.tableController' so we can eventually remove them all at once
      model.on('tick.'+namespace, function() {
        return null;
      });
      model.on('invalidation.'+namespace, function() {
        return null;
      });
      model.on('reset.'+namespace, function() {
        return null;
      });
    }

    // Public API.
    controller = {
      /**
        Called by the interactives controller when the model finishes loading.
      */
      modelLoadedCallback: function() {
        scriptingAPI = interactivesController.getScriptingAPI();
        model = interactivesController.getModel();
        registerModelListeners();
        setup();
      },

      // Returns serialized component definition.
      serialize: function () {
        // start with the initial experimentDefinition.
        var result = $.extend(true, {}, experimentDefinition);
        // possibly add saved data
        return result;
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});
