(function () {
    'use strict';

    var editor = document.getElementById('editor');
    var form = document.getElementById('editor-form');
    var hiddenContent = document.getElementById('content');
    var colorInput = document.getElementById('text-color');
    var savedRange = null;
    var blockTags = ['P', 'H1', 'H2', 'H3', 'LI'];
    var inlineTags = ['STRONG', 'EM', 'U', 'SPAN'];

    function getSelectionRange() {
        var selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        var range = selection.getRangeAt(0);

        if (!editor.contains(range.commonAncestorContainer)) {
            return null;
        }

        return range;
    }

    function saveSelection() {
        var range = getSelectionRange();

        if (range) {
            savedRange = range.cloneRange();
        }
    }

    function restoreSelection() {
        if (!savedRange) {
            editor.focus();
            return null;
        }

        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRange);
        editor.focus();

        return savedRange;
    }

    function closestBlock(node) {
        var current = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

        while (current && current !== editor) {
            if (blockTags.indexOf(current.tagName) !== -1) {
                return current;
            }

            current = current.parentElement;
        }

        return null;
    }

    function ensureBlockForRange(range) {
        var block = closestBlock(range.startContainer);

        if (block) {
            return block;
        }

        var newBlock = document.createElement('p');
        var contents = range.extractContents();
        newBlock.appendChild(contents);
        range.insertNode(newBlock);
        range.selectNodeContents(newBlock);
        savedRange = range.cloneRange();

        return newBlock;
    }

    function getSelectedBlocks(range) {
        var blocks = [];
        var walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT, {
            acceptNode: function (node) {
                if (blockTags.indexOf(node.tagName) === -1) {
                    return NodeFilter.FILTER_SKIP;
                }

                return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
        });

        while (walker.nextNode()) {
            blocks.push(walker.currentNode);
        }

        if (blocks.length === 0) {
            blocks.push(ensureBlockForRange(range));
        }

        return blocks;
    }

    function replaceBlockTag(block, tagName) {
        if (block.tagName.toLowerCase() === tagName || block.tagName === 'LI') {
            return block;
        }

        var replacement = document.createElement(tagName);

        while (block.firstChild) {
            replacement.appendChild(block.firstChild);
        }

        block.replaceWith(replacement);

        return replacement;
    }

    function applyBlock(tagName) {
        var range = restoreSelection() || getSelectionRange();

        if (!range) {
            return;
        }

        var blocks = getSelectedBlocks(range);
        var first = null;
        var last = null;

        blocks.forEach(function (block) {
            var replacement = replaceBlockTag(block, tagName);
            first = first || replacement;
            last = replacement;
        });

        if (first && last) {
            range = document.createRange();
            range.setStartBefore(first);
            range.setEndAfter(last);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            savedRange = range.cloneRange();
        }
    }

    function unwrapInlineChildren(root) {
        var elements = Array.prototype.slice.call(root.querySelectorAll(inlineTags.join(',')));

        elements.reverse().forEach(function (element) {
            var parent = element.parentNode;

            while (element.firstChild) {
                parent.insertBefore(element.firstChild, element);
            }

            parent.removeChild(element);
        });
    }

    function insertFragment(range, fragment) {
        var marker = document.createTextNode('');

        range.deleteContents();
        range.insertNode(marker);
        marker.parentNode.insertBefore(fragment, marker);
        range.setStartAfter(marker);
        range.collapse(true);
        marker.parentNode.removeChild(marker);

        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        savedRange = range.cloneRange();
    }

    function wrapSelection(tagName, attributes) {
        var range = restoreSelection() || getSelectionRange();

        if (!range || range.collapsed) {
            return;
        }

        var wrapper = document.createElement(tagName);

        if (attributes) {
            Object.keys(attributes).forEach(function (name) {
                wrapper.setAttribute(name, attributes[name]);
            });
        }

        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
        range.selectNodeContents(wrapper);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        savedRange = range.cloneRange();
    }

    function applyColor(color) {
        if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
            return;
        }

        wrapSelection('span', { style: 'color: ' + color.toLowerCase() });
    }

    function clearFormatting() {
        var range = restoreSelection() || getSelectionRange();

        if (!range || range.collapsed) {
            return;
        }

        var fragment = range.extractContents();
        unwrapInlineChildren(fragment);
        insertFragment(range, fragment);
    }

    document.querySelectorAll('[data-block]').forEach(function (button) {
        button.addEventListener('mousedown', function (event) {
            event.preventDefault();
        });

        button.addEventListener('click', function () {
            applyBlock(button.getAttribute('data-block'));
        });
    });

    document.querySelectorAll('[data-inline]').forEach(function (button) {
        button.addEventListener('mousedown', function (event) {
            event.preventDefault();
        });

        button.addEventListener('click', function () {
            wrapSelection(button.getAttribute('data-inline'));
        });
    });

    colorInput.addEventListener('mousedown', saveSelection);
    colorInput.addEventListener('input', function () {
        restoreSelection();
        applyColor(colorInput.value);
    });

    document.getElementById('clear-formatting').addEventListener('mousedown', function (event) {
        event.preventDefault();
    });

    document.getElementById('clear-formatting').addEventListener('click', clearFormatting);

    editor.addEventListener('keyup', saveSelection);
    editor.addEventListener('mouseup', saveSelection);
    editor.addEventListener('blur', saveSelection);

    editor.addEventListener('beforeinput', function (event) {
        if (event.inputType === 'formatBold' || event.inputType === 'formatItalic' || event.inputType === 'formatUnderline') {
            event.preventDefault();
        }
    });

    form.addEventListener('submit', function () {
        hiddenContent.value = editor.innerHTML;
    });
}());
