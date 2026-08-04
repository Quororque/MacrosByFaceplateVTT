/*
=========================================================
DISABLE CHAT ENRICHMENT
+ ASTERISK FORMATTING
+ EMOJI SANITIZATION
+ IMAGE EMBED BLOCKING

Foundry VTT v14
=========================================================

Disables:
- Document-link enrichment
- Embedded-document enrichment
- Inline-roll enrichment
- Pasted and embedded chat images

Adds:
- *text*   → italics
- **text** → bold

Removes:
- Unicode emojis
- Emoji flags
- Emoji skin tones
- Emoji keycaps
- Joined emoji sequences
- Clipboard-pasted images
- HTML image embeds

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
             * Rich copied text is allowed through and then
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
     * Remove ordinary images, pasted screenshots,
     * picture elements, SVG images, canvases, and common
     * image-based embeds.
     */
    const imageElements =
        template.content.querySelectorAll(
            [
                "img",
                "picture",
                "source",
                "svg",
                "canvas",
                "input[type='image']",
                "object[type^='image/']",
                "embed[type^='image/']",
                "object[data^='data:image/']",
                "embed[src^='data:image/']"
            ].join(",")
        );

    for (const element of imageElements) {

        removedImages = true;
        element.remove();
    }

    /*
     * Remove image backgrounds pasted as inline styles.
     */
    const styledElements =
        template.content.querySelectorAll(
            "[style]"
        );

    for (const element of styledElements) {

        const backgroundImage =
            element.style?.backgroundImage;

        if (
            backgroundImage &&
            backgroundImage !== "none"
        ) {

            removedImages = true;

            element.style.removeProperty(
                "background-image"
            );
        }
    }

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
     * Images are deliberately absent from this list.
     *
     * Structural text content such as tables or rules may
     * still remain valid.
     */
    return Boolean(
        template.content.querySelector(
            [
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
     */
    const pattern =
        /(?<!\\)\*\*(?=\S)([^*\n]+?)(?<!\s)(?<!\\)\*\*|(?<!\\)\*(?=\S)([^*\n]+?)(?<!\s)(?<!\\)\*/g;

    let previousIndex = 0;
    let match;

    function addPlainText(value) {

        if (!value) return;

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

        fragment.append(element);

        previousIndex =
            pattern.lastIndex;
    }

    addPlainText(
        text.slice(previousIndex)
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
        if (userId !== game.user.id) {
            return;
        }

        /*
         * Leave system-generated roll cards untouched.
         */
        if (message.isRoll) {
            return;
        }

        const originalContent =
            message.content;

        /*
         * Remove images and emojis first.
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
         * Cancel empty messages created from only images,
         * emojis, or whitespace.
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

        if (sanitized.removedImages) {

            ui.notifications.warn(
                "Embedded images were removed from the chat message."
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
    "Chat Formatting, Emoji Sanitization, and Image Blocking | Loaded."
);