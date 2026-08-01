Hooks.once("init", () => {
  const original = TextEditor.enrichHTML;

  TextEditor.enrichHTML = async function(content, options = {}) {
    options.documents = false;
    options.embeds = false;
    options.rolls = false;

    return original.call(this, content, options);
  };
});