/*global define, $*/

define(function (require) {
  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator'),
      TableView = require('common/views/table-view'),
      tableControllerCount = 0;

  return function TableController(component, interactivesController) {
        // Public API.
    var controller,
        model,
        view,
        $element,
        rowIndex,
        columns,
        columnType,
        formatters,
        tableData,
        headerData,
        namespace = "tableController" + (++tableControllerCount);

    function initialize() {
      var parent = interactivesController.interactiveContainer;

      model = interactivesController.getModel();

      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.table, component);

      generateColumnTitlesAndFormatters();
      rowIndex = 0;
      tableData = $.extend(true, [], component.tableData);
      headerData = $.extend(true, [], component.headerData);

      view = new TableView({
        id: component.id,
        title: component.title,
        columns: columns,
        columnType: columnType,
        tableData: tableData,
        formatters: formatters,
        visibleRows: component.visibleRows,
        width: component.width,
        height: component.height,
        tooltip: component.tooltip,
        klasses: [ "interactive-table", "component" ]
      });

      $element = view.render(parent);
    }

    function generateColumnTitlesAndFormatters() {
      var i, propertyName, propertyDescription, propertyTitle, unitAbrev;

      columns = [];
      formatters = [];
      columnType = [];

      if (component.indexColumn) {
        columns.push("#");
        formatters.push(d3.format("f"));
        columnType.push('index');
      }

      for(i = 0; i < component.propertyColumns.length; i++) {
        if (typeof model !== 'undefined') {
          propertyName = component.propertyColumns[i];
          propertyDescription = model.getPropertyDescription(propertyName);
          if (propertyDescription) {
            propertyTitle = propertyDescription.getLabel();
            unitAbrev = propertyDescription.getUnitAbbreviation();
            if (unitAbrev) {
              propertyTitle += ' (' + unitAbrev + ')';
            }
            columns.push(propertyTitle);
            // formatters.push(propertyDescription.format);
            formatters.push(d3.format('.3r'));
          } else {
            columns.push(component.propertyColumns[i]);
            formatters.push(d3.format('.3r'));
          }
        } else {
          columns.push(component.propertyColumns[i]);
          formatters.push(d3.format('.3r'));
        }
        columnType.push('property');
      }

      for(i = 0; i < component.userColumns.length; i++) {
        columns.push(component.userColumns[i]);
        columnType.push('user');
      }
    }

    function updateTable() {
      generateColumnTitlesAndFormatters();
      view.updateTable({
        columns: columns,
        formatters: formatters,
        tableData: tableData
      });
    }

    function appendPropertyRow() {
      var i, rowData = [];
      rowIndex++;
      if (component.indexColumn) {
        rowData.push(rowIndex);
      }
      for(i = 0; i < component.propertyColumns.length; i++) {
        rowData.push(model.get(component.propertyColumns[i]));
      }
      for(i = 0; i < component.userColumns.length; i++) {
        rowData.push('');
      }
      tableData.push(rowData);
      view.appendDataRow(rowData, rowIndex);
    }

    function replacePropertyRow() {
      var i, rowData = [];
      if (component.indexColumn) {
        rowData.push(rowIndex);
      }
      for(i = 0; i < component.propertyColumns.length; i++) {
        rowData.push(model.get(component.propertyColumns[i]));
      }
      for(i = 0; i < component.userColumns.length; i++) {
        rowData.push('');
      }
      if (tableData.length === 0) {
        tableData.push(rowData);
        view.appendDataRow(rowData, rowIndex);
      } else {
        tableData[tableData.length-1] = rowData;
        view.replaceDataRow(rowData, rowIndex);
      }
    }

    /**
      Removes all data from the table that correspond to steps following
      the current step pointer.
      This is used when a change is made that invalidates the future data.
    */
    function removeDataAfterStepPointer() {
      var ptr = model.stepCounter();
      if (tableData.length > ptr-1) {
        tableData.length = ptr;
        rowIndex = ptr;
        updateTable();
      }
    }

    /**
      Causes the table to move the "current" pointer to the current model step.
      This desaturates the table region corresponding to times after the current point.
    */
    function redrawCurrentStepPointer() {
      view.clearSelection();
      view.addSelection(model.stepCounter()+1);
    }

    function registerModelListeners() {
      // Namespace listeners to '.tableController' so we can eventually remove them all at once
      model.on('tick.'+namespace, function () {
        if (component.addNewRows) {
          appendPropertyRow();
        } else {
          replacePropertyRow();
        }
      });

      model.on('stepBack.'+namespace, redrawCurrentStepPointer);
      model.on('stepForward.'+namespace, redrawCurrentStepPointer);
      model.on('seek.'+namespace, redrawCurrentStepPointer);
      model.on('play.'+namespace, function() {
        if (model.stepCounter() < tableData.length) {
          removeDataAfterStepPointer();
        }
      });
      model.on('invalidation.'+namespace, function() {
        replacePropertyRow();
      });
      model.on('reset.'+namespace, modelResetHandler);
    }

    function modelResetHandler() {
      if (component.clearDataOnReset) {
        tableData = $.extend(true, [], component.tableData);
        headerData = $.extend(true, [], component.headerData);
        rowIndex = 0;
        updateTable();
      }
    }

    // Public API.
    controller = {
      /**
        Called by the interactives controller when the model finishes loading.
      */
      modelLoadedCallback: function() {
        model = interactivesController.getModel();
        tableData = $.extend(true, [], component.tableData);
        headerData = $.extend(true, [], component.headerData);
        rowIndex = 0;
        updateTable();
        if (component.streamDataFromModel) {
          registerModelListeners();
        }
      },

      resize: function () {
        if (view) view.resize();
      },

      getData: function(propArray) {
        var i, row, index, j, result = [], rowResult;
        for(i = 0; i < tableData.length; i++) {
          row = tableData[i];
          rowResult = [];
          for(j = 0; j < propArray.length; j++) {
            index = component.propertyColumns.indexOf(propArray[j]);
            if(component.indexColumn) {
              index++;
            }
            rowResult.push(row[index]);
          }
          result.push(rowResult);
        }
        return [result];
      },

      /**
        Used when manually adding a row of property values to the table.
      */
      appendDataPropertiesToComponent: appendPropertyRow,

      // Returns view container.
      getViewContainer: function () {
        return $element;
      },

      // Returns serialized component definition.
      serialize: function () {
        // start with the initial component definition.
        var result = $.extend(true, {}, component);
        // add headerData and tableData
        result.headerData = columns;
        result.tableData = tableData;
        return result;
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});
