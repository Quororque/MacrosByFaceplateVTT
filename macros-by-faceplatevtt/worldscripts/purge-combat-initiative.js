console.log("Purge Combat Initiative loaded.");

Hooks.on("combatStart", async () => {
    const macro = game.macros.getName("Purge Combat Initiative");
    if (!macro) return;

    await new Promise(resolve => setTimeout(resolve, 500));

    await macro.execute();
});