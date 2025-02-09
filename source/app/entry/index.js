"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.exit = void 0;
const userinterface_1 = require("../ui_com/userinterface");
const Waifu_1 = require("../types/Waifu");
const electron_1 = require("electron");
const dependency_loader_1 = require("../dependencies/dependency_loader");
const devices_1 = require("../devices/devices");
const load_plugins_1 = require("../plugins/load_plugins");
const io_1 = require("../io/io");
const state_1 = require("../state/state");
const dependency_freeing_1 = require("../dependencies/dependency_freeing");
const free_plugins_1 = require("../plugins/free_plugins");
const should_update_1 = require("../update/should_update");
const check_python_1 = require("../check_python/check_python");
const twitch_eventsub_1 = require("../twitch/twitch_eventsub");
const should_use_eventsub_1 = require("../twitch/should_use_eventsub");
const setup_event_handlers_1 = require("../twitch/setup_event_handlers");
async function exit() {
    io_1.IO.quietPrint("Exiting w-AI-fu...");
    for (let plugin of Waifu_1.wAIfu.plugins)
        plugin.onQuit();
    (0, free_plugins_1.freePlugins)(Waifu_1.wAIfu.plugins);
    await (0, dependency_freeing_1.freeDependencies)(Waifu_1.wAIfu.dependencies);
    if (Waifu_1.wAIfu.dependencies?.twitch_eventsub !== undefined)
        Waifu_1.wAIfu.dependencies.twitch_eventsub.free();
    Waifu_1.wAIfu.dependencies?.ui?.free();
    io_1.IO.setClosedCaptions("");
    electron_1.app.exit();
}
exports.exit = exit;
async function main() {
    process.on("uncaughtException", (e) => {
        io_1.IO.error("w-AI-fu encountered an unhandled exception.");
        io_1.IO.error(e.stack);
    });
    process.on("unhandledRejection", (e) => {
        io_1.IO.error("w-AI-fu encountered an unhandled rejection.");
        if (e !== undefined && e.stack !== undefined)
            io_1.IO.error(e.stack);
        else
            io_1.IO.error(e);
    });
    io_1.IO.debug("Awaiting Electron...");
    await electron_1.app.whenReady();
    const startup_win = new electron_1.BrowserWindow({
        alwaysOnTop: true,
        title: "w-AI-fu startup",
        width: 400,
        height: 200,
        icon: process.cwd() + "/source/ui/icon.ico",
        autoHideMenuBar: true,
        titleBarStyle: "hidden",
        show: false,
        center: true,
        skipTaskbar: true,
    });
    startup_win
        .loadFile(process.cwd() + "/source/ui/startup_placeholder.html")
        .then(() => {
        startup_win.show();
    });
    process.title = "w-AI-fu";
    Waifu_1.wAIfu.version = Waifu_1.wAIfu.getVersion();
    io_1.IO.print("w-AI-fu", Waifu_1.wAIfu.version);
    io_1.IO.debug("Checking python install...");
    if (!(0, check_python_1.isPythonInstalledPlusSetup)())
        return;
    io_1.IO.debug("Loading application state...");
    Waifu_1.wAIfu.state = new state_1.AppState();
    io_1.IO.debug("Fetching audio devices...");
    Waifu_1.wAIfu.state.devices = (0, devices_1.getDevices)();
    io_1.IO.debug("Loading dependencies...");
    Waifu_1.wAIfu.dependencies = await (0, dependency_loader_1.loadDependencies)();
    Waifu_1.wAIfu.dependencies.ui = new userinterface_1.UserInterface();
    io_1.IO.debug("Loading plugins...");
    Waifu_1.wAIfu.plugins = (0, load_plugins_1.loadPlugins)();
    io_1.IO.debug("Creating Electron window...");
    electron_1.app.name = "w-AI-fu";
    const win = new electron_1.BrowserWindow({
        title: "w-AI-fu",
        width: 900,
        height: 900,
        icon: process.cwd() + "/source/ui/icon.ico",
        autoHideMenuBar: true,
        show: false,
    });
    win.on("close", (e) => {
        e.preventDefault();
        io_1.IO.quietPrint("Exited after UI closing.");
        exit();
    });
    await win.loadFile(process.cwd() + "/source/ui/index.html");
    await Waifu_1.wAIfu.dependencies.ui.initialize();
    io_1.IO.bindToUI(Waifu_1.wAIfu.dependencies.ui);
    startup_win.close();
    win.show();
    io_1.IO.debug("Checking for updates...");
    (0, should_update_1.checkUpdates)();
    if ((0, should_use_eventsub_1.shouldUseEventSub)() === true) {
        io_1.IO.debug("Loading Twitch EventSub API...");
        Waifu_1.wAIfu.dependencies.twitch_eventsub = new twitch_eventsub_1.TwitchEventSubs();
        await Waifu_1.wAIfu.dependencies.twitch_eventsub.initialize();
        (0, setup_event_handlers_1.setupTwitchEventSubListeners)(Waifu_1.wAIfu.dependencies.twitch_eventsub);
    }
    io_1.IO.debug("Initialization done.");
    while (true)
        await Waifu_1.wAIfu.mainLoop();
}
exports.main = main;
setImmediate(main);
