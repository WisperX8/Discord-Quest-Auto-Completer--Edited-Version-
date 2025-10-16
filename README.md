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

<details>
<summary>Click to expand for script</summary>

```javascript
(() => {
  delete window.$;
  let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
  webpackChunkdiscord_app.pop();

  let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata).exports.Z;
  let RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getRunningGames).exports.ZP;
  let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getQuest).exports.Z;
  let ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent).exports.Z;
  let GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getSFWDefaultChannel).exports.ZP;
  let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.flushWaitQueue).exports.Z;
  let api = Object.values(wpRequire.c).find(x => x?.exports?.tn?.get).exports.tn;

  var isApp = typeof DiscordNative !== "undefined";

  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function completeQuest(quest) {
    const pid = Math.floor(Math.random() * 30000) + 1000;
    const applicationId = quest.config.application.id;
    const applicationName = quest.config.application.name;
    const questName = quest.config.messages.questName;
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    const taskName = ["WATCH_VIDEO","PLAY_ON_DESKTOP","STREAM_ON_DESKTOP","PLAY_ACTIVITY","WATCH_VIDEO_ON_MOBILE"].find(x=>taskConfig.tasks[x]!=null);
    const secondsNeeded = taskConfig.tasks[taskName].target;
    let secondsDone = quest.userStatus?.progress?.[taskName]?.value??0;

    if(taskName==="WATCH_VIDEO"||taskName==="WATCH_VIDEO_ON_MOBILE"){
      const maxFuture=10,speed=7,interval=1;
      const enrolledAt=new Date(quest.userStatus.enrolledAt).getTime();
      let completed=false;
      while(true){
        const maxAllowed=Math.floor((Date.now()-enrolledAt)/1000)+maxFuture;
        const diff=maxAllowed-secondsDone;
        const timestamp=secondsDone+speed;
        if(diff>=speed){
          const res=await api.post({url:`/quests/${quest.id}/video-progress`,body:{timestamp:Math.min(secondsNeeded,timestamp+Math.random())}});
          completed=res.body.completed_at!=null;
          secondsDone=Math.min(secondsNeeded,timestamp);
        }
        if(timestamp>=secondsNeeded)break;
        await delay(interval*1000);
      }
      if(!completed)await api.post({url:`/quests/${quest.id}/video-progress`,body:{timestamp:secondsNeeded}});
      console.log(`Quest "${questName}" completed!`);
    } else {
      console.log(`Unsupported or Desktop/Stream quest. Use Discord Desktop app for "${questName}".`);
    }
  }

  async function doAllQuests(){
    const quests=[...QuestsStore.quests.values()].filter(q=>q.userStatus?.enrolledAt&&!q.userStatus?.completedAt&&new Date(q.config.expiresAt).getTime()>Date.now());
    if(quests.length===0){console.log("No pending quests found.");return;}
    console.log(`${quests.length} quest(s) found.`);
    for(const q of quests){await completeQuest(q);await delay(1000);}
    console.log("All quests have been completed.");
  }

  doAllQuests();
})();
