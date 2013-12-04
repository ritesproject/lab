(function (window) {

  function Table(idOrElement, options, message, tabindex) {
    var api = {},   // Public API object to be returned.

        // D3 selection of the containing DOM element the table is placed in
        elem,

        // Regular representation of containing DOM element the table is placed in
        node,

        // JQuerified version of DOM element
        $node,

        // d3 table selections, containing rendered table
        table,
        theader,
        tbody,
        trows,
        tcells,

        // Size of containing DOM element
        cx, cy,

        // Object containing width and height in pixels of interior plot area of graph
        size,

        // Padding object
        padding,

        // rows in table
        rows,

        // columns in table
        cols,

        // column formatters
        formatters,

        // font sizes
        fontSizeInPixels,
        halfFontSizeInPixels,
        quarterFontSizeInPixels,

        // size of header font, in pixels
        headerFontSizeInPixels,

        // size of datum font, in pixels
        datumFontSizeInPixels,

        default_options = {
          rows: 5,
          cols: 5,
          formatters: [null, null, null, null, null]
        };


    // ------------------------------------------------------------
    //
    // Initialization
    //
    // ------------------------------------------------------------

    function initialize(idOrElement, opts) {
      if (opts || !options) {
        options = setupOptions(opts);
      }

      initializeLayout(idOrElement);

      size = {
        "width":  120,
        "height": 120
      };

      padding = {
        "left": "0.5 em",
        "right": "0.5 em",
        "top": "0.5 em",
        "bottom": "0.5 em"
      };
    }

    function initializeLayout(idOrElement) {
      if (idOrElement) {
        // d3.select works both for element ID (e.g. "#grapher")
        // and for DOM element.
        elem = d3.select(idOrElement);
        node = elem.node();
        $node = $(node);
        // cx = $node.width();
        // cy = $node.height();
        cx = elem.property("clientWidth");
        cy = elem.property("clientHeight");
      }
    }

    function scale(w, h) {
      if (!w && !h) {
        cx = Math.max(elem.property("clientWidth"), 60);
        cy = Math.max(elem.property("clientHeight"),60);
      } else {
        cx = w;
        node.style.width =  cx +"px";
        if (!h) {
          node.style.height = "100%";
          h = elem.property("clientHeight");
          cy = h;
          node.style.height = cy +"px";
        } else {
          cy = h;
          node.style.height = cy +"px";
        }
      }
    }

    function calculateLayout() {
      scale();

      fontSizeInPixels = parseFloat($node.css("font-size"));

      if (!options.fontScaleRelativeToParent) {
        $node.css("font-size", '1 em');
      }

      fontSizeInPixels = parseFloat($node.css("font-size"));

      halfFontSizeInPixels    = fontSizeInPixels/2;
      quarterFontSizeInPixels = fontSizeInPixels/4;

      headerFontSizeInPixels = fontSizeInPixels;
      datumFontSizeInPixels  = fontSizeInPixels;

      updateAxesAndSize();
    }

    function updateAxesAndSize() {
      size.width  = Math.max(cx - padding.left - padding.right, 60);
      size.height = Math.max(cy - padding.top  - padding.bottom, 60);
    }

    function adjustColumnWidths() {
      var width = 100 / options.headers.length;
      if (table) {
        table.selectAll("th").attr("width", "" + width + "%");
        table.selectAll("td").attr("width", "" + width + "%");
      }
    }

    function setupOptions(options) {
      if (options) {
        for(var p in default_options) {
          if (options[p] === undefined) {
            options[p] = default_options[p];
          }
        }
      } else {
        options = default_options;
      }
      var d = options.data;
      for (var i = 0; i < options.rows; i++) {
        if (d[i] === undefined) {
          d[i] = [];
        }
        if (d[i].length < options.cols) {
          d[i].length = options.cols;
        }
      }
      return options;
    }

    // ------------------------------------------------------------
    //
    // Rendering
    //
    // ------------------------------------------------------------

    //
    // Render a new table by creating the dom elements
    //
    function renderNewTable() {

      var classMap = {
        "Numeric": "numeric",
        "OpenResponse": "editable"
      }

      table = elem.append("table")
        .attr("class","tabler");

      theader = table.append('thead').append("tr").attr("width", "100%")
        .selectAll("th")
        .data(options.headers)
        .enter()
          .append("th")
            .text(function(d){return d ? d : "";});

      tbody = table.append("tbody");

      trows = tbody.selectAll("tr")
        .data(options.data)
        .enter()
          .append("tr")
          .attr("width", "100%");

      tcells = trows.selectAll("td")
        .data(function(row){return row;})
        .enter()
          .append("td")
          .append("div")
            .attr("class", function(d,i){return classMap[options.columnTypes[i]];})
            .text(function(d){return d;});

      $("div.numeric").each(function(){
        var $node = $("<input></input>");

        $node.val($(this).text());
        $(this).text('');
        $(this).append($node);
      })

      adjustColumnWidths();
    }

    //
    // Repaint an existing graph by rescaling/updating the SVG and Canvas elements
    //
    function repaintExistingTable() {
      // TODO
    }

    function getComputedTextLength(el) {
      if (el.getComputedTextLength) {
        return el.getComputedTextLength();
      } else {
        return 100;
      }
    }

    //
    // Redraw the plot and axes when plot is translated or axes are re-scaled
    //
    function redraw() {
      updateAxesAndSize();
      repaintExistingTable();
      adjustColumnWidths();
      update();
    }

    function update() {
      // TODO
    }

    // ------------------------------------------------------------
    //
    // Adding data
    //
    // ------------------------------------------------------------

    // ------------------------------------------------------------
    //
    // Main API functions ...
    //
    // ------------------------------------------------------------

    function renderTable() {
      calculateLayout();
      if (table === undefined) {
        renderNewTable();
      } else {
        repaintExistingTable();
      }
      redraw();
    }

    function reset(idOrElement, options, message) {
      if (arguments.length) {
        initialize(idOrElement, options, message);
      } else {
        initialize();
      }
      renderTable();
      // and then render again using actual size of SVG text elements are
      renderTable();
      redraw();
      return api;
    }

    function resize(w, h) {
      scale(w, h);
      initializeLayout();
      renderTable();
      redraw();
      return api;
    }

    //
    // Public API to instantiated Graph
    //
    api = {
      update:               update,
      repaint:              renderTable,
      reset:                reset,
      redraw:               redraw,
      resize:               resize,

      width: function(_) {
        if (!arguments.length) return size.width;
        size.width = _;
        return api;
      },

      height: function(_) {
        if (!arguments.length) return size.height;
        size.height = _;
        return api;
      },

      numberOfRows: function(_) {
        if (!arguments.length) return rows;
        rows = _;
        return api;
      },

      numberOfCols: function(_) {
        if (!arguments.length) return cols;
        cols = _;
        return api;
      },

    };

    // Initialization.
    initialize(idOrElement, options);

    if (node) {
      renderTable();
      // Render again using actual size of SVG text elements.
      renderTable();
    }

    return api;
  }

  // Support node-style modules and AMD.
  if (typeof module === "object" && module && typeof module.exports === "object") {
    module.exports = Table;
  } else if (typeof define === "function" && define.amd) {
    define(function () { return Table; });
  }

  // If there is a window object, that at least has a document property,
  // define Lab.tabler.Table.
  if (typeof window === "object" && typeof window.document === "object") {
    window.Lab = window.Lab || {};
    window.Lab.tabler = window.Lab.tabler || {};
    window.Lab.tabler.Table = Table;
  }

})(window);