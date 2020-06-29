import './style.css';

import $ from 'jquery';        //make jquery() available as $
import Meta from './meta.js';  //bundle the input to this program

//default values
const DEFAULT_REF = '_';       //use this if no ref query param
const N_UNI_SELECT = 4;        //switching threshold between radio & select
const N_MULTI_SELECT = 4;      //switching threshold between checkbox & select

/*************************** Utility Routines **************************/

/** Return `ref` query parameter from window.location */
function getRef() {
    const url = new URL(window.location);
    const params = url.searchParams;
    return params && params.get('ref');
}

/** Return window.location url with `ref` query parameter set to `ref` */
function makeRefUrl(ref) {
    const url = new URL(window.location);
    url.searchParams.set('ref', ref);
    return url.toString();
}

/** Return a jquery-wrapped element for tag and attr */
function makeElement(tag, attr = {}) {
    const $e = $(`<${tag}/>`);
    Object.entries(attr).forEach(([k, v]) => $e.attr(k, v));
    return $e;
}

/** Given a list path of accessors, return Meta[path].  Handle
 *  occurrences of '.' and '..' within path.
 */
function access(path) {
    const normalized = path.reduce((acc, p) => {
        if (p === '.') {
            return acc;
        } else if (p === '..') {
            return acc.length === 0 ? acc : acc.slice(0, -1)
        } else {
            return acc.concat(p);
        }
    }, []);
    return normalized.reduce((m, p) => m[p], Meta);
}

/** Return an id constructed from list path */
function makeId(path) {
    return ('/' + path.join('/'));
}

function getType(meta) {
    return meta.type || 'block';
}

/** Return a jquery-wrapped element <tag meta.attr>items</tag>
 *  where items are the recursive rendering of meta.items.
 *  The returned element is also appended to $element.
 */
function items(tag, meta, path, $element) {
    const $e = makeElement(tag, meta.attr);
    (meta.items || []).forEach((item, i) => render(path.concat('items', i), $e));
    $element.append($e);
    return $e;
}

/************************** Event Handlers *****************************/

//@TODO

function typeHandler(event, meta) {
    const $target = $(event.target);

    const isCheckbox = $target.attr('type') === 'checkbox';
    const isMultiple = $target.attr('multiple') === 'multiple';
    if (isCheckbox) {
        const $checked = [];
        $(`input[name="${meta.attr.name}"]:checked`).each((i, $obj) => {
            $checked.push($obj.value);
        })
        if ($checked.length === 0) {
            if (meta.required) {
                $(`div[id="${event.target.id}"]`).text(`The field ${meta.text} must be specified`);
            } else {
                $(`div[id="${event.target.id}"]`).text('');
            }
        } else {
            $(`div[id="${event.target.id}"]`).text('');
        }
    } else if (isMultiple) {
        if($target.val().length === 0) {
            if(meta.required) {
                $(`div[id="${event.target.id}"]`).text(`The field ${meta.text} must be specified`);
            } else {
                $(`div[id="${event.target.id}"]`).text('');
            }
        } else {
            $(`div[id="${event.target.id}"]`).text('');
        }
    } else {
        if ($target.val().trim() === '') {
            if ($target.attr('required')) {
                $(`div[id="${event.target.id}"]`).text(`The field ${meta.text} must be specified`);
            } else {
                $(`div[id="${event.target.id}"]`).text('');
            }
        } else if (meta.chkFn) {
            if (meta.chkFn($target.val(), meta, Meta)) {
                $(`div[id="${event.target.id}"]`).text('');
            } else {
                $(`div[id="${event.target.id}"]`).text(meta.errMsgFn ? meta.errMsgFn($target.val(), meta) : `invalid value ${$target.val()}`);
            }
        } else {
            //no error
            $(`div[id="${event.target.id}"]`).text('');
        }
    }

}

/********************** Type Routine Common Handling *******************/

//@TODO
function optionItems(item) {

    const $e = makeElement('option', {value: item.key}).text(!(item.text === undefined || item.text === '') ? item.text : item.key);
    return $e;
}

function inputItems(item, type, attr) {
    const $label = makeElement('label', {for: "ID"}).text(
        (!item.text) ? item.key : item.text
    )
    const $inputAttr = Object.assign({}, attr || {}, {type: type, value: `${item.key}`})
    const $input = makeElement('input', $inputAttr);

    return [$label, $input]
}


/***************************** Type Routines ***************************/

//A type handling function has the signature (meta, path, $element) =>
//void.  It will append the HTML corresponding to meta (which is
//Meta[path]) to $element.

function block(meta, path, $element) {
    items('div', meta, path, $element);
}

function form(meta, path, $element) {

    const $form = items('form', meta, path, $element).attr('noValidate', 'noValidate');
    $form.submit(function (event) {
        event.preventDefault();
        const $form = $(this);
        //@TODO

        $("input,select, textarea").trigger('blur');
        $("input, select").trigger('change');

        if(!$('.error', $form).text()){
            const results = $form.serializeArray().reduce((acc, v) => {

                const isCheckbox = $(`[name="${v.name}"]`, $form).attr('type') === 'checkbox';
                const isMultiple = $(`[name="${v.name}"]`, $form).attr('multiple') === 'multiple';

                if (isCheckbox || isMultiple) {
                    acc[v.name] = (acc[v.name] || []).concat(v.value);
                } else {

                    acc[v.name] = v.value;
                }

                return acc;
            }, {});
            console.log(JSON.stringify(results, null, 2));
        }else {
            console.log('Form not submitted')
        }

    });
}

function header(meta, path, $element) {
    const $e = makeElement(`h${meta.level || 1}`, meta.attr);
    $e.text(meta.text || '');
    $element.append($e);
}

function input(meta, path, $element) {
    //@TODO
//@TODO pending adding event listener and validation
    const labelAttr = Object.assign({}, {for: makeId(path)});
    $element.append(makeElement('label', labelAttr).text((meta.required ? `${meta.text}*` : meta.text)));
    if (meta.subType === 'textarea') {
        const $e = makeElement('div', {});
        const $textAreaArr = Object.assign({}, meta.attr || {}, {id: makeId(path)});
        const $textArea = makeElement('textarea', $textAreaArr);
        $e.append($textArea);
        $e.append(makeElement('div', {class: "error", id: makeId(path)}));
        $element.append($e);

        $textArea.on('blur', ($event) => {
            typeHandler($event, meta);
        });
    } else {
        const $e = makeElement('div', {});
        const $inputAttr = Object.assign({}, meta.attr || {}, {id: makeId(path)}, {
            type: meta.subType || 'text',
            'required': meta.required
        });
        const $input = makeElement('input', $inputAttr);


        $e.append($input);
        $e.append(makeElement('div', {class: "error", id: makeId(path)}));
        $element.append($e);

        $input.on('blur change', ($event) => {
            typeHandler($event, meta);
        });
    }

}

function link(meta, path, $element) {
    const parentType = getType(access(path.concat('..')));
    const {text = '', ref = DEFAULT_REF} = meta;
    const attr = Object.assign({}, meta.attr || {}, {href: makeRefUrl(ref)});
    $element.append(makeElement('a', attr).text(text));
}

function multiSelect(meta, path, $element) {
    //@TODO
    if (meta.items.length > (Meta._options.N_MULTI_SELECT || N_MULTI_SELECT)) {
        $element.append(makeElement('label', {for: makeId(path)}).text((meta.required ? `${meta.text}*` : meta.text)));
        const $e = makeElement('div', {});
        const $selectAttr = Object.assign({}, meta.attr, {'multiple': true, id: makeId(path)});
        const $select = makeElement('select', $selectAttr).prop('required', meta.required)
        $select.on('blur change', ($event) => {
            typeHandler($event, meta);
        });
        $e.append($select);
        (meta.items || []).forEach((item) => {
            $select.append(optionItems(item));
        });
        $e.append(makeElement('div', {class: "error", id: makeId(path)}));
        $element.append($e);
    } else {
        $element.append(makeElement('label', {for: makeId(path)}).text((meta.required ? `${meta.text}*` : meta.text)));
        const $e = makeElement('div', {});
        const $fieldset = makeElement('div', {class: "fieldset"});
        (meta.items || []).forEach((item) => {
            const $checkboxAttr = Object.assign({}, meta.attr || {}, {id: makeId(path)});
            const $input = inputItems(item, 'checkbox', $checkboxAttr);
            $input[1].on('change', ($event) => {
                typeHandler($event, meta);
            });
            $fieldset.append($input[0]).append($input[1]);
        })
        $e.append($fieldset);

        $e.append(makeElement('div', {class: "error", id: makeId(path)}));
        $element.append($e);
    }
}

function para(meta, path, $element) {
    items('p', meta, path, $element);
}

function segment(meta, path, $element) {
    if (meta.text !== undefined) {
        $element.append(makeElement('span', meta.attr).text(meta.text));
    } else {
        items('span', meta, path, $element);
    }
}


function submit(meta, path, $element) {
    //@TODO
    block(meta, path, $element);
    const submitAttr = Object.assign({}, meta.attr || {}, {type: 'submit'});

    const $e = makeElement('button', submitAttr);
    $e.text(meta.text || 'Submit');
    $element.append($e);
}

function uniSelect(meta, path, $element) {
    //@TODO
    if (meta.items.length > (Meta._options.N_UNI_SELECT || N_UNI_SELECT)) {
        $element.append(makeElement('label', {for: makeId(path)}).text((meta.required ? `${meta.text}*` : meta.text)));
        const $e = makeElement('div', {});
        $element.append($e);
        const $selectAttr = Object.assign({}, meta.attr || {}, {'required': meta.required, id: makeId(path)})
        const $select = makeElement('select', $selectAttr);
        $select.on('blur change', ($event) => {
            typeHandler($event, meta);
        });
        (meta.items || []).forEach((item) => {
            $select.append(optionItems(item));
        })
        $e.append($select);
        $e.append(makeElement('div', {class: "error", id: makeId(path)}));
        $element.append($e);
    } else {
        $element.append(makeElement('label', {for: makeId(path)}).text((meta.required ? `${meta.text}*` : meta.text)));
        const $e = makeElement('div', {});
        const $fieldset = makeElement('div', {class: "fieldset"});
        (meta.items || []).forEach((item) => {
            const $radioAttr = Object.assign({}, meta.attr || {}, {id: makeId(path)});
            const $input = inputItems(item, 'radio', $radioAttr);
            $fieldset.append($input[0]).append($input[1]);
        })
        $e.append($fieldset);
        $e.append(makeElement('div', {class: "error", id: makeId(path)}));
        $element.append($e);
    }

}


//map from type to type handling function.  
const FNS = {
    block,
    form,
    header,
    input,
    link,
    multiSelect,
    para,
    segment,
    submit,
    uniSelect,
};

/*************************** Top-Level Code ****************************/

function render(path, $element = $('body')) {
    const meta = access(path);
    if (!meta) {
        $element.append(`<p>Path ${makeId(path)} not found</p>`);
    } else {
        const type = getType(meta);
        const fn = FNS[type];
        if (fn) {
            fn(meta, path, $element);
        } else {
            $element.append(`<p>type ${type} not supported</p>`);
        }
    }
}

function go() {
    const ref = getRef() || DEFAULT_REF;
    render([ref]);
}

go();
