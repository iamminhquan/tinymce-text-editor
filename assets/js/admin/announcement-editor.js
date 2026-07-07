(function () {
    'use strict';

    if (!window.tinymce) {
        return;
    }

    tinymce.init({
        selector: 'textarea.announcement-editor',
        license_key: 'gpl',
        menubar: false,
        height: 360,
        branding: false,
        plugins: 'lists link autolink code',
        toolbar: 'undo redo | blocks | bold italic underline | forecolor backcolor | bullist numlist | link | removeformat',
        block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3',
        valid_elements: 'p,br,strong,b,em,i,u,ul,ol,li,h1,h2,h3,a[href],span[style]',
        valid_styles: {
            span: 'color,background-color'
        },
        color_map: [
            '000000', 'Black',
            '374151', 'Gray',
            'ef4444', 'Red',
            'f59e0b', 'Amber',
            '10b981', 'Green',
            '3b82f6', 'Blue',
            '8b5cf6', 'Violet',
            'ffffff', 'White'
        ],
        custom_colors: false,
        default_link_target: '_self',
        link_assume_external_targets: 'https',
        convert_urls: false,
        setup: function (editor) {
            editor.on('change keyup undo redo', function () {
                editor.save();
            });
        }
    });
}());
