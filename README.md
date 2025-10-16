# Discord Quest Auto-Completer (Edited Version)

**Note**  
This script automatically completes all your accepted quests in Discord.  
This does **not** work for browser-based quests that require you to "play" a game or stream — for those, use the **Discord Desktop app**.  

---

## How to use this script:

1. Accept a quest under **Discover → Quests**.
2. Press `Ctrl+Shift+I` to open DevTools.
3. Go to the **Console** tab.
4. Paste the code below and press **Enter**.
   - If you're unable to paste into the console, type `allow pasting` and press **Enter** first.
5. The script will automatically process all pending quests.
6. Wait a bit for it to complete each quest.
7. You can now claim your rewards!
8. Track progress via **Console prints** or the progress bars in the Quests tab.

---
**Disclaimer:**  
- This script is based on the original work by [aamiaa](https://gist.github.com/aamiaa/204cd9d42013ded9faf646fae7f89fbb) and has been edited for personal use and to automatically complete multiple quests in one run.  
- Use at your own risk; may violate Discord's Terms of Service.  

<details>
<summary>Click to expand for script</summary>

```javascript
(async () => {
  delete window.$;
  let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
  webpackChunkdiscord_app.pop();

  let RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getRunningGames).exports.ZP;
  let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getQuest).exports.Z;
  let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.flushWaitQueue).exports.Z;
  var isApp = typeof DiscordNative !== "undefined";

  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function completeDesktopQuest(quest) {
    const pid = Math.floor(Math.random() * 30000) + 1000;
    const applicationId = quest.config.application.id;
    const applicationName = quest.config.application.name;
    const questName = quest.config.messages.questName;
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    const secondsNeeded = taskConfig.tasks.PLAY_ON_DESKTOP.target;
    let lastProgress = quest.userStatus?.progress?.PLAY_ON_DESKTOP?.value ?? 0;

    if(!isApp){ console.log(`❌ Desktop Discord required for "${questName}"`); return; }

    return new Promise(resolve => {
      const fakeGame = {
        cmdLine: `C:\\Program Files\\${applicationName}\\${applicationName}.exe`,
        exeName: `${applicationName}.exe`,
        exePath: `c:/program files/${applicationName.toLowerCase()}/${applicationName}.exe`,
        hidden: false,
        isLauncher: false,
        id: applicationId,
        name: applicationName,
        pid: pid,
        pidPath: [pid],
        processName: applicationName,
        start: Date.now()
      };

      const realGames = RunningGameStore.getRunningGames();
      const realGetRunningGames = RunningGameStore.getRunningGames;
      const realGetGameForPID = RunningGameStore.getGameForPID;

      // Shto fake game tek lista ekzistuese, mos e zëvendëso
      RunningGameStore.getRunningGames = () => [...realGames, fakeGame];
      RunningGameStore.getGameForPID = (p) => [...realGames, fakeGame].find(x => x.pid === p);
      FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: [...realGames, fakeGame] });

      const progressCheck = data => {
        let progress = Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
        if(progress > lastProgress) lastProgress = progress;
        console.log(`Quest progress "${questName}": ${Math.min(progress, secondsNeeded)}/${secondsNeeded}`);
        if(progress >= secondsNeeded){
          console.log(`✅ Quest "${questName}" completed!`);
          FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", progressCheck);
          resolve(); // tregojmë që ky quest ka mbaruar
        }
      };

      FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", progressCheck);
    });
  }

  async function doAllDesktopQuests() {
    const quests = [...QuestsStore.quests.values()].filter(q => {
      if(!q.userStatus?.enrolledAt || q.userStatus?.completedAt) return false;
      const taskConfig = q.config.taskConfig ?? q.config.taskConfigV2;
      return taskConfig && taskConfig.tasks && taskConfig.tasks.PLAY_ON_DESKTOP;
    });

    if(quests.length === 0){
      console.log("⛔ No pending Desktop quests.");
      return;
    }

    console.log(`🔹 Found ${quests.length} Desktop quest(s). Starting...`);

    // Kjo metodë i shton të gjitha quest-et tek lista e fakeGames
    const allQuests = quests.map(q => completeDesktopQuest(q));
    await Promise.all(allQuests);

    console.log("🎉 All Desktop quests have been fully completed!");
  }

  doAllDesktopQuests();
})();
