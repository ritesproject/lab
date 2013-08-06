define(function() {

  return function SelectBoxView(opts) {
    var options  = opts.options,
        label    = opts.label,
        labelOn  = opts.labelOn,
        onChange = opts.onChange,
        ignoreChangeEvent,
        $select,
        $wrapper;

    function changeHandler() {
      var index;

      if (ignoreChangeEvent) {
        // Ignore change event caused by the pulldown menu update. It prevents from infinite loop of
        // pulldown - property updates.
        ignoreChangeEvent = false;
        return;
      }
      index = $(this).prop('selectedIndex');
      onChange(options[index], index);
    }

    return {

      updateSelection: function(selection) {
        // Set flag indicating that change event should be ignored by our own change listener. It
        // prevents from infinite loop like: pulldown update => property update => pulldown update =>
        // ... It's necessary as selectOption() call below will trigger change event of original
        // select. It's used by selectBoxIt to update its view.
        ignoreChangeEvent = true;
        // Retrieve all of the SelectBoxIt methods and call selectOption(). Note that we have to call
        // .toString() as numeric values are interpreted as option index by selectBoxIt. See:
        // http://gregfranko.com/jquery.selectBoxIt.js/#Methods
        $select.data("selectBox-selectBoxIt").selectOption(selection.toString());
      },

      render: function(parent, id) {
        var $options = [],
            $option, $label, ulWidth, arrowWidth, boxWidth;

        $select = $('<select>');

        options.forEach(function(option) {
          $option = $('<option>').html(option.text);
          $options.push($option);
          if (option.disabled) {
            $option.prop("disabled", option.disabled);
          }
          if (option.selected) {
            $option.prop("selected", option.selected);
          }
          // allow pulldowns to have falsy values, such as 0.
          if (option.value !== undefined) {
            $option.prop("value", option.value);
          }
          $select.append($option);
        });

        $select.change(changeHandler);

        // First append label to wrapper, then <select>
        $wrapper = $('<div>').attr('id', id);
        if (label) {
          $label = $("<span>").text(label);
          $label.addClass("label");
          $label.addClass(labelOn === "top" ? "on-top" : "on-left");
          $wrapper.append($label);
        }
        $wrapper.append($select);

        // Must call selectBoxIt after appending to wrapper
        $select.selectBoxIt();

        $wrapper.find(".selectboxit").css("width", "auto");

        // SelectBoxIt assumes that all select boxes are always going to have a width
        // set in CSS (default 220px). This doesn't work for us, as we don't know how
        // wide the content is going to be. Instead we have to measure the needed width
        // of the internal ul list, and use that to define the width of the select box.
        //
        // This issue has been raised in SelectBoxIt:
        // https://github.com/gfranko/jquery.selectBoxIt.js/issues/129
        //
        // However, this is still problematic because we haven't added the element to
        // the page yet. This $().measure function allows us to embed the element hidden
        // on the page first to allow us to check the required width.

        // ems for a given pixel size
        function pxToEm(input) {
          var emSize = parseFloat(parent.css("font-size"));
          return input / emSize;
        }

        function width() {
          return this.width();
        }

        ulWidth    = pxToEm($wrapper.measure(width, "ul", parent));
        arrowWidth = pxToEm($wrapper.measure(width, ".selectboxit-arrow-container", parent));
        boxWidth   = ulWidth + arrowWidth + 0.3;

        $wrapper.find(".selectboxit").css("width", boxWidth + "em");
        $wrapper.find(".selectboxit-text").css("max-width", ulWidth + "em");

        // set hidden select box dimensions too, for mobile devices
        $wrapper.find(".selectboxit-container select").css({ width: boxWidth, height: "100%" });

        return $wrapper;
      }
    };
  };
});
