function createValue(data) {
    var out = {
        __observers: [],
        postValue: function (v) {
            this.value = v;
            for (var i = 0; i < this.__observers.length; i++) {
                this.__observers[i](v);
            }
        },
        notifyChange: function () {
            for (var i = 0; i < this.__observers.length; i++) {
                this.__observers[i](this.value);
            }
        },
        value: data,
    };
    if (data instanceof Array) {
        out.append = function (v) {
            if (this.value instanceof Array) {
                this.value.push(v);
            } else {
                throw new Error('invalid operation: calling append on a non-array observable value')
            }
            this.notifyChange();
        };
    } else if (typeof data === 'number') {
        out.inc = function (v) {
            if (!v) {
                this.value++;
            } else if (typeof v === 'number') {
                this.value += v;
            } else {
                throw new Error('invalid input type for inc():' + (typeof v))
            }
            this.notifyChange();
        }
    }
    return out;
}
var __leaf_randomIDs = {}

function __leaf_generateID(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    var counter = 0;
    for (; counter < length;) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    result = '___' + result + '___'
    if (__leaf_randomIDs[result]) {
        return __leaf_generateID(length);
    }
    __leaf_randomIDs[result] = true;
    return result;
}

function renderLeaf(elemID, $) {
    $._root = $;
    return __leaf_hydrate(document.getElementById(elemID), $);
}
function __leaf_isLowerCaseEnglish(c) {
    var l = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
    for (var i = 0; i < l.length; i++) {
        if (c === l.charAt(i)) {
            return true;
        }
    }
    return false;
}

function __leaf_createElemByString(s) {
    var div = document.createElement('div');
    div.innerHTML = s;
    return div.firstChild;
}

function __leaf_isVariableName(c) {
    var l = 'abcdefghijklmnopqrstuvwxyz';
    for (var i = 0; i < l.length; i++) {
        if (c === l.charAt(i)) {
            return true;
        }
    }
    return false;
}

function __leaf_hydrate(elem, $) {
    var s = elem.innerHTML;

    // attributes
    for (var i = 0; i < elem.attributes.length; i++) {
        var name = elem.attributes[i].name;
        if (!name.startsWith('l-')) {
            continue;
        }

        name = name.substring(2);
        var value = '';
        if (name.startsWith('style-')) {
            value = name.substring(6);
            name = 'style';
        } else if (name.startsWith('class-')) {
            value = name.substring(6);
            name = 'class';
        } else if (name === 'for') {
            var token = elem.attributes[i].value;
            var result = __leaf_executeToken(token, $);
            if (!result) {
                throw new Error('the returned type is not an observable<Array>: l-for="' + token + '", instead it is ' + result.value)
            }
            if (result.__observers && result.postValue && result.value instanceof Array || result instanceof Array) {
            } else {
                throw new Error('the returned type is not an observable or array: l-for="' + token + '"')
            }

            elem.removeAttribute('l-for');
            elem.setAttribute('__leaf_for_item', token);

            var fn = function (parentNode, forLoopTemplate, datalist, token) {
                var domList = [];
                var started = false;
                for (var j = 0; j < parentNode.children.length; j++) {
                    var sibling = parentNode.children[j];
                    if (sibling.tagName === elem.tagName && sibling.getAttribute('__leaf_for_item') === token) {
                        sibling.style.display = '';
                        domList.push(sibling);
                        started = true;
                        continue;
                    }
                    if (!started) {
                        continue;
                    }
                    break;
                }

                // compare
                var toAppend = [];
                for (var j = 0; j < domList.length || j < datalist.length; j++) {
                    if (j >= datalist.length) {
                        //delete
                        if (j === 0) {
                            domList[j].style.display = 'none';
                        } else {
                            parentNode.removeChild(domList[j]);
                        }
                        continue;
                    }
                    var newElem = __leaf_createElemByString(forLoopTemplate);
                    __leaf_hydrate(newElem, datalist[j]);
                    if (j < domList.length) {
                        // replace
                        parentNode.insertBefore(newElem, domList[j]);
                        parentNode.removeChild(domList[j]);
                        continue;
                    }
                    //append newElem
                    toAppend.push(newElem);
                }

                if (toAppend && toAppend.length > 0) {
                    var suffixIndex = -1;
                    for (var k = 0; k < parentNode.children.length; k++) {
                        if (parentNode.children[k].getAttribute('__leaf_for_item') === token) {
                            suffixIndex = k;
                            continue;
                        }
                        if (suffixIndex > -1) {
                            break;
                        }
                    }

                    if (suffixIndex == -1) {
                        throw new Error("suffix index of domList is not found: this means leaf.js unexpectedly delete the hidden first element of l-for, now we couldn't find it any more");
                    }
                    var next = null;
                    if (suffixIndex < parentNode.children.length - 1) {
                        next = parentNode.children[suffixIndex + 1];
                    }
                    for (var n = 0; n < toAppend.length; n++) {
                        if (next) {
                            parentNode.insertBefore(toAppend[n], next)
                        } else {
                            parentNode.appendChild(toAppend[n]);
                        }
                    }
                }
            }

            // add observers
            if (result.__observers && result.postValue) {
                (function (parentNode, forLoopTemplate, observableListValue, token) {
                    observableListValue.__observers.push(function (v) {
                        fn(parentNode, forLoopTemplate, observableListValue.value, token);
                    });
                })(elem.parentNode, elem.outerHTML, result, token);
                result = result.value;
            }
            fn(elem.parentNode, elem.outerHTML, result, token)

            return $ // l-for handled, no need to render the rest
        }

        // normal attributes
        (function (name, token, observables) {
            var assembleAttributesData = function (name, token) {
                var result = __leaf_executeToken(token, $);
                if (result && result.__observers && result.postValue) {
                    result = result.value;
                }
                if (name === 'class') {
                    if (result) {
                        __leaf_addClass(elem, value);
                    } else {
                        __leaf_removeClass(elem, value);
                    }
                    return;
                } else if (name === 'if') {
                    if (result) {
                        elem.style.display = '';
                    } else {
                        elem.style.display = 'none';
                    }
                    return;
                }
                if (typeof result === 'boolean') {
                    if (result) {
                        elem.setAttribute(name, value)
                    } else {
                        elem.removeAttribute(name)
                    }
                } else {
                    elem.setAttribute(name, result)
                }
            };
            for (var j = 0; j < observables.length; j++) {
                var node = observables[j];
                if (node.__observers && node.postValue) {
                    node.__observers.push(function (v) {
                        assembleAttributesData(name, token);
                    })
                }
            }
            assembleAttributesData(name, token);
        })(name, elem.attributes[i].value, __leaf_parseObservablesInToken(elem.attributes[i].value, $))
    }


    // top level text
    var childLevel = 0;
    var template = [''];
    var leftToken = -1;
    var tokenGroups = [
        [],
    ];
    for (var i = 0; i < s.length - 1; i++) {
        var char1 = s.charAt(i);
        var char2 = s.charAt(i + 1);
        if (char1 === '<') {
            if (char2 === '/') {
                var foundEnding = false;
                i++;
                for (; i < s.length; i++) {
                    if (s.charAt(i) === '>') {
                        foundEnding = true;
                        break;
                    }
                }
                if (!foundEnding) {
                    throw new Error('ending arrow for [</] not found: ' + s.substring(0, i));
                }
                childLevel--;
                if (childLevel === 0) {
                    template.push('');
                    tokenGroups.push([]);
                }
                continue;
            }

            if (__leaf_isLowerCaseEnglish(char2)) {
                childLevel++;
                continue;
            }
            continue;
        }

        if (childLevel > 0) {
            continue;
        }

        // top level text
        if (char1 + char2 === '{{') {
            leftToken = i;
            i++;
            continue;
        }

        if (leftToken > -1) {
            if (char1 + char2 === '}}') {
                var tokenOrigin = s.substring(leftToken + 2, i);
                var uniqueID = __leaf_generateID(16);
                template[template.length - 1] += uniqueID;
                tokenGroups[tokenGroups.length - 1].push({
                    templateIndex: template.length - 1,
                    origin: tokenOrigin,
                    uniqueID: uniqueID,
                });
                i++;
                leftToken = -1;
                continue;
            }
            continue;
        }

        template[template.length - 1] += char1;
        if (i >= s.length - 2) {
            template[template.length - 1] += char2;
        }
    }

    // listen innerText
    for (var i = 0; i < tokenGroups.length; i++) {
        var group = tokenGroups[i];
        for (var j = 0; j < group.length; j++) {
            var token = group[j];
            var observables = __leaf_parseObservablesInToken(token.origin, $);
            (function (templateIndex) {
                for (var k = 0; k < observables.length; k++) {
                    var node = observables[k];
                    if (node.__observers && node.postValue) {
                        node.__observers.push(function (v) {
                            __leaf_assembleAndReplaceTopLevelInnerText(elem, template, tokenGroups, templateIndex, $);
                        });
                    }
                }
            })(token.templateIndex)

        }
    }

    // render innerText
    for (var i = 0; i < template.length; i++) {
        __leaf_assembleAndReplaceTopLevelInnerText(elem, template, tokenGroups, i, $)
    }

    // children
    for (var i = 0; i < elem.children.length; i++) {
        __leaf_hydrate(elem.children[i], $);
    }
    return $;
}

function __leaf_removeClass(elem, className) {
    var s = elem.getAttribute('class');
    if (s && s.indexOf(className) > -1) {
        elem.setAttribute('class', s.replace(className, ''));
    }
    return;
}

function __leaf_addClass(elem, className) {
    var s = elem.getAttribute('class');
    if (!s) {
        s = '';
    }
    if (s.indexOf(className) === -1) {
        elem.setAttribute('class', s + ' ' + className);
    }
    return;
}

function __leaf_executeToken(__leaf_token_origin, $) {
    eval(__leaf_evaluateVariablesOfObject($, '$'));
    var result = eval(__leaf_token_origin);
    return result
}
function __leaf_evaluateVariablesOfObject(obj, objName) {
    if (typeof obj !== 'object') {
        return;
    }
    var builder = '';
    for (var key in obj) {
        var s = 'var ' + key + '=' + objName + '.' + key;
        var v = obj[key];
        if (v.__observers && v.postValue && !(v.value instanceof Array)) {
            s += '.value';
        }
        builder += s + ';';
    }
    return builder;
}

function __leaf_parseObservablesInToken(tokenOrigin, $) {
    var observables = [];
    var variableStarted = -1;
    for (var i = 0; i < tokenOrigin.length; i++) {
        var char = tokenOrigin[i];
        if (__leaf_isVariableName(char)) {
            if (variableStarted === -1) {
                variableStarted = i;
                continue;
            }
            continue;
        }
        if (variableStarted === -1) {
            continue;
        }
        // variable ending
        var variableName = tokenOrigin.substring(variableStarted, i);
        var observable = $[variableName];
        if (observable) {
            if (variableStarted > 0 && tokenOrigin[variableStarted - 1] === '.') {
                variableStarted = -1;
                continue;
            }
            observables.push(observable);
        }
        variableStarted = -1;
    }
    if (variableStarted !== -1) {
        // variable until the end
        var variableName = tokenOrigin.substring(variableStarted, tokenOrigin.length);
        var observable = $[variableName];
        if (observable) {
            if (variableStarted > 0 && tokenOrigin[variableStarted - 1] === '.') {
            } else {
                observables.push(observable);
            }
        }
    }
    return observables;
}

function __leaf_assembleAndReplaceTopLevelInnerText(elem, template, tokenGroups, templateIndex, $) {
    var s = elem.innerHTML;
    var childLevel = 0;
    var currentTemplateIndex = 0;
    var builder = '';
    for (var i = 0; i < s.length; i++) {
        var char1 = s.charAt(i);
        var char2 = '';
        if (i < s.length - 1) {
            char2 = s.charAt(i + 1);
        }

        if (char1 === '<') {
            builder += char1;
            if (char2 === '/') {
                var foundEnding = false;
                i++;
                for (; i < s.length; i++) {
                    builder += s.charAt(i);
                    if (s.charAt(i) === '>') {
                        foundEnding = true;
                        break;
                    }
                }
                if (!foundEnding) {
                    throw new Error('ending arrow for [</] not found: ' + s.substring(0, i));
                }
                childLevel--;
                if (childLevel === 0) {
                    currentTemplateIndex++;
                }
                continue;
            }

            if (i >= s.length - 2) {
                builder += char2;
            }
            if (__leaf_isLowerCaseEnglish(char2)) {
                childLevel++;
            }
            continue;
        }

        if (childLevel > 0 || currentTemplateIndex != templateIndex) {
            builder += char1;
            if (i >= s.length - 2) {
                builder += char2;
            }
            continue;
        }

        // replace template
        var targetTemplate = template[templateIndex];
        for (var j = 0; j < tokenGroups[templateIndex].length; j++) {
            var token = tokenGroups[templateIndex][j];
            var result = __leaf_executeToken(token.origin, $);
            if (result && result.__observers && result.postValue) {
                result = result.value;
            }
            targetTemplate = targetTemplate.replace(token.uniqueID, result);
        }
        builder += targetTemplate;
        currentTemplateIndex++;
        i++;
        // slipping to current template ending
        for (; i < s.length; i++) {
            var char = s.charAt(i);
            if (char === '<') {
                i--;
                break;
            }
        }
    }
    elem.innerHTML = builder;
}