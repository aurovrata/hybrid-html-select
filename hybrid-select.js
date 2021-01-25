/*
Hybrid Select JavaScript plugin
Version: 1.0
Authors: Sandrina Pereira & Aurovrata Venet
Twitter: @a_sandrina_p / @aurovrata
GitHub: https://github.com/aurovrata/hybrid-html-select
*/

// global module creation
(function (factory) {
  typeof define === 'function' && define.amd
    ? define(factory)
    : typeof exports === 'object'
      ? (module.exports = factory())
      : factory()
})(function () { //hybrid-select factory.
	let _window = typeof window !== 'undefined' ? window : this;
	let HybridSelect = (_window.HybridSelect = function (element, settings) {
    //verify we have an element.
    if(typeof element === 'undefined'){
      throw new Error("Cannot initialise HybridSelect object with null element.");
    }
		if(element.nodeName !== "SELECT") {
      throw new Error("Attempting to convert element "+element.nodeName+" into HybridSelect object.");
    }

    let _ = this;
    //if already instanciated, return existing object.
    if(element._hselect) return element._hselect;
    element._hselect = _; //expose object in its original DOM element.

    _.el = element; //keep original element reference.
    _.el.classList.add('hybrid-select'); //flag the element as converted.

    // merge user setting with defaults
    _.opt = Object.assign(
      {}, //empty target.
      {
        eventPropagate:true,
        optionLabel: function(label){
          return '<span>'+label+'</span>';
        },
        selectedLabel: function(label){
          return label;
        }
      }, //default settings.
      settings //user settings.
    );
    //initialise the hybrid-select.
    _.init();
	});
  /* Prototyping some methods for HybridSelect object */
  let hsProtype = HybridSelect.prototype;
  //initialisation function.
  hsProtype.init = function(){
    let _ = this;
    //wrapper for select and hybrid select.
    let c = document.createElement('div');
    c.classList.add('hybrid-select-container');
    _.el.parentNode.insertBefore(c, _.el.nextSibling);
    c.appendChild(_.el);
    //construct the hybrid-select.
    _.hselect = document.createElement('div');
    _.el.parentNode.appendChild(_.hselect);
    _.hselect.classList.add('hybrid-select-js')
    _.hselect.setAttribute('aria-hidden', true);//hide from readers.
    _.hselect.selected = document.createElement('div');
    _.hselect.appendChild(_.hselect.selected);
    _.hselect.selected.classList.add('hybrid-selected');
    _.hselect.options = document.createElement('div');
    _.hselect.appendChild(_.hselect.options);
    _.hselect.options.classList.add('hybrid-options');
    _.hindex = -1; //initial option hover index.
    _.sindex = -1; //initial inex of selected option.
    _.value = ""; //initial value.
    //build list of options.
    for(let o of _.el.children){
      //TODO: check if o is optgrp, and loop over.
      if(o.selected===true) _.hselect.selected.innerHTML = _.opt.selectedLabel(o.textContent);
      let hso = document.createElement('div');
      hso.setAttribute('data-value',o.value);
      hso.innerHTML =_.opt.optionLabel(o.textContent);
      hso.classList.add('hybrid-option');
      _.hselect.options.appendChild(hso);
    }
    //bind some events....
    //listen for 'change' on the original select.
    _.event(_.el,'add',{
      change: _.updateFromOriginal.bind(_)
    });
    let getOption = _.optionsSelected.bind(_);
    _.event(_.hselect.options,'add',{
      click: getOption,
      keydown: getOption
    });
    //listen for click and down arrow events.
    _.hselect.open = _.openSelect.bind(_);
    _.event(_.hselect, 'add',{
      click: _.hselect.open,
      keydown:_.hselect.open
    });
    //create a close function.
    _.hselect.close = _.closeSelect.bind(_);
    //fire init event.
    _.emit('hybrid-select-init');
  }
  //method to add event listeners.
  hsProtype.event = function (ele, type, args) {
    var eventHandler = ele[type + 'EventListener'].bind(ele)
    Object.keys(args).forEach(function (k) {
      if('mouseenter'===k)   eventHandler(k, args[k],true);
      else eventHandler(k, args[k])
    })
  }
  //method to update the hybrid select value.
  hsProtype.updateSelection = function(idx, emit){
    let _ = this;
    if(_.sindex >=0) _.hselect.options.children[_.sindex].classList.remove('active');
    _.sindex = idx;
    _.hselect.options.children[idx].classList.add('active');
    //update values.
    _.el.value = _.value = _.hselect.options.children[idx].getAttribute('data-value');

    //update the selected label.
    _.hselect.selected.innerHTML = _.hselect.options.children[idx].innerHTML;
    if(emit) _.emit('change');
  }
  //update from original
  hsProtype.updateFromOriginal = function(){
    let _ = this;
    if(_.el.value === _.value) return; //not need to update.
    let sel = _.hselect.options.querySelector(`.hybrid-option[data-value="${_.el.value}"`);
    sel = [..._.hselect.options.children].indexOf(o); //index in hybrid.
    _.updateSelection(sel, false);
  }
  //trigger events.
  hsProtype.emit = function (name, arg) {
    let _ = this,
      e = new _window.CustomEvent(name, {
      bubbles: true,
      detail: arg
    })
    _.el.dispatchEvent(e)
  }
  //options selected.
  hsProtype.optionsSelected = function(){
    let _ = this, e = arguments[0];
    if(e && e.target){
      e = e.target;
      if(e.classList.contains('.hybrid-option')===false) e = e.closest('.hybrid-option');
      let idx = [..._.hselect.options.children].indexOf(e); //index in hybrid.
      _.updateSelection(idx, true);
      //close the dropdown
      _.closeSelect();
    }
  }
  //function to flag options being hovered.
  hsProtype.optionHover = function(){
    let _ = this, e = arguments[0];
    if(e && e.target && e.target.classList.contains('hybrid-option')) {
      if(_.hindex>=0) _.hselect.options.children[_.hindex].classList.remove('hover');
      _.hindex = [..._.hselect.options.children].indexOf(e.target);
      _.hselect.options.children[_.hindex].classList.add('hover');
    }
  }
  //open hybrid dropdown.
  hsProtype.openSelect = function(){
    let _= this, e = arguments[0];
    if(e.target.classList.contains('hybrid-selected')==false && e.target.closest('.hybrid-selected') === null){
      return;  // bubbling selection
    }
    e.stopPropagation();
    if(_.hselect.classList.contains('active')) {
      _.closeSelect();
      return;
    }
    _.hselect.classList.add('active');
    _.event(_.hselect.options,'add',{
      mouseenter: _.optionHover.bind(_)
    });
    //listen for external clicks to close.
    _.event(document, 'add',{
      click: _.hselect.close
    });

  }
  //close hybrid dropdown.
  hsProtype.closeSelect = function(){
    let _ = this, e = arguments[0];

    if(e && e.target && e.target.classList.contains('hselect-option')) return;

    _.hselect.classList.remove('active');
    //reset the option hover index.
    if(_.hindex>=0) _.hselect.options.children[_.hindex].classList.remove('hover');
    _.hindex = -1;
    //stop listening to external clicks.
    _.event(document, 'remove',{
      click: _.close
    });
  }
	return HybridSelect;
})
