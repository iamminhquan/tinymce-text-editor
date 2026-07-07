<?php
function is_safe_hex_color(string $color): bool
{
    return (bool) preg_match('/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', trim($color));
}

function sanitize_style_color(string $style): string
{
    $rules = explode(';', $style);
    $allowed = [];

    foreach ($rules as $rule) {
        $parts = explode(':', $rule, 2);

        if (count($parts) !== 2) {
            continue;
        }

        $property = strtolower(trim($parts[0]));
        $value = trim($parts[1]);

        if (($property === 'color' || $property === 'background-color') && is_safe_hex_color($value)) {
            $allowed[] = $property . ': ' . strtolower($value);
        }
    }

    return implode('; ', $allowed);
}

function is_safe_href(string $href): bool
{
    $href = trim(html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8'));

    if ($href === '' || preg_match('/[\x00-\x1F\x7F]/', $href)) {
        return false;
    }

    $scheme = parse_url($href, PHP_URL_SCHEME);

    if ($scheme === null) {
        return true;
    }

    return in_array(strtolower($scheme), ['http', 'https', 'mailto', 'tel'], true);
}

function append_sanitized_children(DOMNode $source, DOMNode $target, DOMDocument $clean): void
{
    foreach ($source->childNodes as $child) {
        $sanitized = sanitize_node($child, $clean);

        if ($sanitized instanceof DOMDocumentFragment) {
            $target->appendChild($sanitized);
        } elseif ($sanitized instanceof DOMNode) {
            $target->appendChild($sanitized);
        }
    }
}

function sanitize_node(DOMNode $node, DOMDocument $clean): ?DOMNode
{
    $allowedTags = [
        'p' => true,
        'br' => true,
        'strong' => true,
        'b' => true,
        'em' => true,
        'i' => true,
        'u' => true,
        'ul' => true,
        'ol' => true,
        'li' => true,
        'h1' => true,
        'h2' => true,
        'h3' => true,
        'a' => true,
        'span' => true,
    ];

    $blockedTags = [
        'script' => true,
        'iframe' => true,
        'img' => true,
        'object' => true,
        'embed' => true,
        'link' => true,
        'style' => true,
        'meta' => true,
    ];

    if ($node instanceof DOMText) {
        return $clean->createTextNode($node->nodeValue);
    }

    if (!($node instanceof DOMElement)) {
        return null;
    }

    $tag = strtolower($node->tagName);

    if (isset($blockedTags[$tag])) {
        return null;
    }

    if (!isset($allowedTags[$tag])) {
        $fragment = $clean->createDocumentFragment();
        append_sanitized_children($node, $fragment, $clean);
        return $fragment;
    }

    $element = $clean->createElement($tag);

    if ($tag === 'span' && $node->hasAttribute('style')) {
        $style = sanitize_style_color($node->getAttribute('style'));

        if ($style !== '') {
            $element->setAttribute('style', $style);
        }
    }

    if ($tag === 'a' && $node->hasAttribute('href')) {
        $href = $node->getAttribute('href');

        if (is_safe_href($href)) {
            $element->setAttribute('href', trim($href));
        }
    }

    if ($tag !== 'br') {
        append_sanitized_children($node, $element, $clean);
    }

    return $element;
}

function sanitize_html(string $html): string
{
    $source = new DOMDocument('1.0', 'UTF-8');
    libxml_use_internal_errors(true);
    $source->loadHTML(
        '<!doctype html><html><body><div id="root">' . $html . '</div></body></html>',
        LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
    );
    libxml_clear_errors();

    $root = $source->getElementById('root');
    $clean = new DOMDocument('1.0', 'UTF-8');
    $fragment = $clean->createDocumentFragment();

    if ($root) {
        append_sanitized_children($root, $fragment, $clean);
    }

    $clean->appendChild($fragment);

    $output = '';
    foreach ($clean->childNodes as $child) {
        $output .= $clean->saveHTML($child);
    }

    return $output;
}

$submittedTitle = '';
$submittedContent = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submittedTitle = trim((string) ($_POST['title'] ?? ''));
    $submittedContent = sanitize_html((string) ($_POST['content'] ?? ''));
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vanilla Rich Text Editor Demo</title>
    <link rel="stylesheet" href="assets/css/editor.css">
</head>
<body>
    <main class="page">
        <h1>Vanilla Rich Text Editor Demo</h1>

        <form id="editor-form" method="post" action="">
            <label class="field">
                <span>Title</span>
                <input type="text" name="title" value="<?= htmlspecialchars($submittedTitle, ENT_QUOTES, 'UTF-8') ?>" required>
            </label>

            <div class="editor-shell">
                <textarea id="content" name="content" class="announcement-editor"><?= htmlspecialchars($submittedContent, ENT_QUOTES, 'UTF-8') ?></textarea>
            </div>

            <button type="submit" class="submit-button">Submit</button>
        </form>

        <?php if ($_SERVER['REQUEST_METHOD'] === 'POST'): ?>
            <section class="result" aria-label="Sanitized output">
                <h2>Sanitized Result</h2>
                <p><strong>Title:</strong> <?= htmlspecialchars($submittedTitle, ENT_QUOTES, 'UTF-8') ?></p>
                <div class="result-content" id="result-content"><?= $submittedContent ?></div>
                <h3>Sanitized HTML</h3>
                <pre><?= htmlspecialchars($submittedContent, ENT_QUOTES, 'UTF-8') ?></pre>
            </section>
        <?php endif; ?>
    </main>

    <script src="assets/vendor/tinymce/tinymce.min.js"></script>
    <script src="assets/js/admin/announcement-editor.js"></script>
</body>
</html>
