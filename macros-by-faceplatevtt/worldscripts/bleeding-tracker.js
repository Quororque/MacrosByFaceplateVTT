console.log("Bleeding Tracker worldscript loaded.");

Hooks.on("combatStart", async () => {
    const macro = game.macros.getName("Bleeding Tracker");
    if (!macro) return;

    await new Promise(resolve => setTimeout(resolve, 100));

    await macro.execute();
});