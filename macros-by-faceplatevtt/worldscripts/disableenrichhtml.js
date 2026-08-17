/*
=========================================================
DISABLE CHAT ENRICHMENT
+ ASTERISK FORMATTING
+ EMOJI SANITIZATION
+ PASTED IMAGE BLOCKING

Foundry VTT v14
=========================================================

Disables:
- Document-link enrichment
- Embedded-document enrichment
- Inline-roll enrichment
- Clipboard-pasted chat images

Adds:
- *text*   → italics
- **text** → bold

Removes:
- Unicode emojis
- Emoji flags
- Emoji skin tones
- Emoji keycaps
- Joined emoji sequences
- Clipboard/data/blob images
- Emoji image embeds

Preserves:
- Foundry/system/module images
- Status-effect icons
- Condition Lab icons

Escape asterisks with a backslash:
- \*literal asterisks\*
=========================================================
*/

/* =====================================================
   DISABLE FOUNDRY ENRICHMENTS
===================================================== */

Hooks.once("init", () => {

    const originalEnrichHTML =
        TextEditor.enrichHTML;

    TextEditor.enrichHTML =
        async function (content, options = {}) {

            return originalEnrichHTML.call(
                this,
                content,
                {
                    ...options,
                    documents: false,
                    embeds: false,
                    rolls: false
                }
            );
        };

});

/* =====================================================
   BLOCK DIRECT IMAGE PASTES INTO CHAT
===================================================== */

Hooks.once("ready", () => {

    document.addEventListener(
        "paste",
        event => {

            const target =
                event.target instanceof Element
                    ? event.target
                    : null;

            /*
             * Affect only Foundry's chat editor.
             */
            const insideChatEditor =
                target?.closest(
                    [
                        "#chat-form",
                        ".chat-form",
                        ".chat-resizer-host",
                        "prose-mirror.chat",
                        "prose-mirror.chat-input"
                    ].join(",")
                );

            if (!insideChatEditor) {
                return;
            }

            const clipboardItems =
                Array.from(
                    event.clipboardData?.items ?? []
                );

            const hasImage =
                clipboardItems.some(
                    item =>
                        item.type?.startsWith(
                            "image/"
                        )
                );

            const hasText =
                clipboardItems.some(
                    item =>
                        item.type === "text/plain" ||
                        item.type === "text/html"
                );

            /*
             * A direct screenshot or copied image usually
             * contains image data without usable text.
             *
             * Prevent it from entering ProseMirror.
             *
             * Rich copied text is allowed through and is
             * sanitized again before message creation.
             */
            if (hasImage && !hasText) {

                event.preventDefault();
                event.stopPropagation();

                ui.notifications.warn(
                    "Pasting images into chat is disabled."
                );
            }

        },
        true
    );

});

/* =====================================================
   EMOJI SANITIZER
===================================================== */

const EMOJI_SEQUENCE_PATTERN =
    /(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|(?:\p{Emoji_Presentation}\uFE0F?|\p{Extended_Pictographic}\uFE0F)(?:\p{Emoji_Modifier})?(?:\u200D(?:\p{Emoji_Presentation}\uFE0F?|\p{Extended_Pictographic}\uFE0F)(?:\p{Emoji_Modifier})?)*(?:[\u{E0020}-\u{E007E}]+\u{E007F})?)/gu;

const EMOJI_REMAINDER_PATTERN =
    /(?:\p{Emoji_Modifier}|\u200D|\uFE0F|\u20E3|[\u{E0020}-\u{E007F}])/gu;

function removeEmojiFromText(text) {

    if (
        typeof text !== "string" ||
        !text
    ) {
        return text;
    }

    return text
        .replace(
            EMOJI_SEQUENCE_PATTERN,
            ""
        )
        .replace(
            EMOJI_REMAINDER_PATTERN,
            ""
        )
        .replace(
            /[ \t]{2,}/g,
            " "
        );
}

/* =====================================================
   CHAT CONTENT SANITIZER
===================================================== */

function sanitizeChatHTML(html) {

    if (
        typeof html !== "string" ||
        !html
    ) {
        return {
            html,
            removedImages: false
        };
    }

    const template =
        document.createElement("template");

    template.innerHTML = html;

    let removedImages = false;

    /*
     * Remove only images which came directly from pasted
     * clipboard/browser data.
     *
     * IMPORTANT:
     *
     * Do NOT remove ordinary Foundry/module images.
     * Status effects, system cards, module-generated
     * icons, etc. generally use normal file paths and
     * must survive.
     */
    const pastedImages =
        template.content.querySelectorAll(
            [
                "img[src^='data:image/']",
                "img[src^='blob:']",

                "source[src^='data:image/']",
                "source[src^='blob:']",

                "object[data^='data:image/']",
                "object[data^='blob:']",

                "embed[src^='data:image/']",
                "embed[src^='blob:']"
            ].join(",")
        );

    for (const element of pastedImages) {

        removedImages = true;

        element.remove();
    }

    /*
     * Remove explicit image-based emoji.
     *
     * Ordinary Foundry/module/status icons are not
     * affected.
     */
    const emojiImages =
        template.content.querySelectorAll(
            [
                "img.emoji",
                "img[data-emoji]",
                "[data-emoji]"
            ].join(",")
        );

    for (const element of emojiImages) {

        removedImages = true;

        element.remove();
    }

    /*
     * Remove pasted data/blob background images while
     * preserving ordinary Foundry/module background
     * images.
     */
    const styledElements =
        template.content.querySelectorAll(
            "[style]"
        );

    for (const element of styledElements) {

        const backgroundImage =
            element.style?.backgroundImage ?? "";

        if (
            backgroundImage.includes(
                "data:image/"
            ) ||
            backgroundImage.includes(
                "blob:"
            )
        ) {

            removedImages = true;

            element.style.removeProperty(
                "background-image"
            );
        }
    }

    /*
     * Emoji sanitization applies to text nodes.
     */
    const walker =
        document.createTreeWalker(
            template.content,
            NodeFilter.SHOW_TEXT
        );

    const textNodes = [];

    while (walker.nextNode()) {

        const textNode =
            walker.currentNode;

        const parent =
            textNode.parentElement;

        if (
            parent?.closest(
                "script, style"
            )
        ) {
            continue;
        }

        textNodes.push(textNode);
    }

    for (const textNode of textNodes) {

        const sanitizedText =
            removeEmojiFromText(
                textNode.nodeValue
            );

        if (
            sanitizedText !==
            textNode.nodeValue
        ) {

            textNode.nodeValue =
                sanitizedText;
        }
    }

    return {
        html: template.innerHTML,
        removedImages
    };
}

/* =====================================================
   CHECK WHETHER CONTENT REMAINS
===================================================== */

function hasVisibleMessageContent(html) {

    const template =
        document.createElement("template");

    template.innerHTML =
        html ?? "";

    const visibleText =
        template.content.textContent
            ?.replace(/\s+/g, "") ??
        "";

    if (visibleText.length > 0) {
        return true;
    }

    /*
     * Legitimate Foundry/module content may consist of
     * images or other structural HTML.
     *
     * Clipboard data/blob images have already been
     * stripped by sanitizeChatHTML().
     */
    return Boolean(
        template.content.querySelector(
            [
                "img",
                "picture",
                "svg",
                "video",
                "audio",
                "table",
                "hr",
                "blockquote"
            ].join(",")
        )
    );
}

/* =====================================================
   ASTERISK FORMATTER
===================================================== */

function formatAsterisksInHTML(html) {

    if (
        typeof html !== "string" ||
        !html.includes("*")
    ) {
        return html;
    }

    const template =
        document.createElement("template");

    template.innerHTML = html;

    const walker =
        document.createTreeWalker(
            template.content,
            NodeFilter.SHOW_TEXT
        );

    const textNodes = [];

    while (walker.nextNode()) {

        const textNode =
            walker.currentNode;

        const parent =
            textNode.parentElement;

        /*
         * Do not process text that is already formatted
         * or contained inside links or code blocks.
         */
        if (
            parent?.closest(
                "strong, b, em, i, code, pre, a"
            )
        ) {
            continue;
        }

        if (
            textNode.nodeValue?.includes("*")
        ) {
            textNodes.push(textNode);
        }
    }

    /*
     * Replace nodes after completing the walk so DOM
     * changes do not interfere with the TreeWalker.
     */
    for (const textNode of textNodes) {

        textNode.replaceWith(
            formatAsteriskText(
                textNode.nodeValue
            )
        );
    }

    return template.innerHTML;
}

function formatAsteriskText(text) {

    const fragment =
        document.createDocumentFragment();

    /*
     * Match bold before italics:
     *
     * **bold**
     * *italics*
     *
     * Opening and closing markers cannot be escaped.
     * Formatted text cannot begin or end with whitespace.
     */
    const pattern =
        /(?<!\\)\*\*(?=\S)([^*\n]+?)(?<!\s)(?<!\\)\*\*|(?<!\\)\*(?=\S)([^*\n]+?)(?<!\s)(?<!\\)\*/g;

    let previousIndex = 0;
    let match;

    function addPlainText(value) {

        if (!value) {
            return;
        }

        fragment.append(
            document.createTextNode(
                value.replace(
                    /\\\*/g,
                    "*"
                )
            )
        );
    }

    while (
        (match = pattern.exec(text)) !== null
    ) {

        addPlainText(
            text.slice(
                previousIndex,
                match.index
            )
        );

        const boldText =
            match[1];

        const italicText =
            match[2];

        const element =
            document.createElement(
                boldText !== undefined
                    ? "strong"
                    : "em"
            );

        element.textContent =
            (
                boldText ??
                italicText
            ).replace(
                /\\\*/g,
                "*"
            );

        fragment.append(
            element
        );

        previousIndex =
            pattern.lastIndex;
    }

    addPlainText(
        text.slice(
            previousIndex
        )
    );

    return fragment;
}

/* =====================================================
   PROCESS OUTGOING CHAT
===================================================== */

Hooks.on(
    "preCreateChatMessage",
    (
        message,
        data,
        options,
        userId
    ) => {

        /*
         * Process only messages created by this client.
         */
        if (
            userId !== game.user.id
        ) {
            return;
        }

        /*
         * Leave system-generated roll cards untouched.
         */
        if (
            message.isRoll
        ) {
            return;
        }

        const originalContent =
            message.content;

        /*
         * Remove pasted images and emojis first.
         *
         * Legitimate Foundry/module images survive.
         */
        const sanitized =
            sanitizeChatHTML(
                originalContent
            );

        /*
         * Apply bold and italics afterward.
         */
        const formattedContent =
            formatAsterisksInHTML(
                sanitized.html
            );

        /*
         * Cancel empty messages created from only pasted
         * images, emojis, or whitespace.
         *
         * Legitimate Foundry/module image content is
         * considered valid.
         */
        if (
            !hasVisibleMessageContent(
                formattedContent
            )
        ) {

            ui.notifications.warn(
                "Image-only and emoji-only chat messages are disabled."
            );

            return false;
        }

        if (
            sanitized.removedImages
        ) {

            ui.notifications.warn(
                "Pasted images or emojis were removed from the chat message."
            );
        }

        if (
            formattedContent ===
            originalContent
        ) {
            return;
        }

        message.updateSource({
            content: formattedContent
        });
    }
);

console.log(
    "Chat Formatting, Emoji Sanitization, and Pasted Image Blocking | Loaded."
);