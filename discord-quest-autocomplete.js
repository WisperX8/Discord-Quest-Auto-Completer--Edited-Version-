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

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function completeQuest(quest) {
    const pid = Math.floor(Math.random() * 30000) + 1000;
    const applicationId = quest.config.application.id;
    const applicationName = quest.config.application.name;
    const questName = quest.config.messages.questName;
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null);
    const secondsNeeded = taskConfig.tasks[taskName].target;
    let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

    if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
      const maxFuture = 10, speed = 7, interval = 1;
      const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
      let completed = false;
      while (true) {
        const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
        const diff = maxAllowed - secondsDone;
        const timestamp = secondsDone + speed;
        if (diff >= speed) {
          const res = await api.post({
            url: `/quests/${quest.id}/video-progress`,
            body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) }
          });
          completed = res.body.completed_at != null;
          secondsDone = Math.min(secondsNeeded, timestamp);
        }
        if (timestamp >= secondsNeeded) break;
        await delay(interval * 1000);
      }
      if (!completed) {
        await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
      }
      console.log(`Quest "${questName}" completed!`);
    } else if (taskName === "PLAY_ON_DESKTOP") {
      if (!isApp) {
        console.log(`Desktop Discord required for ${questName}`);
      } else {
        const res = await api.get({ url: `/applications/public?application_ids=${applicationId}` });
        const appData = res.body[0];
        const exeName = appData.executables.find(x => x.os === "win32").name.replace(">", "");
        const fakeGame = {
          cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
          exeName,
          exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
          hidden: false,
          isLauncher: false,
          id: applicationId,
          name: appData.name,
          pid: pid,
          pidPath: [pid],
          processName: appData.name,
          start: Date.now(),
        };
        const realGames = RunningGameStore.getRunningGames();
        const fakeGames = [fakeGame];
        const realGetRunningGames = RunningGameStore.getRunningGames;
        const realGetGameForPID = RunningGameStore.getGameForPID;
        RunningGameStore.getRunningGames = () => fakeGames;
        RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid);
        FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });

        const progressCheck = data => {
          let progress = Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
          console.log(`Progress: ${progress}/${secondsNeeded}`);
          if (progress >= secondsNeeded) {
            console.log(`Quest "${questName}" completed!`);
            RunningGameStore.getRunningGames = realGetRunningGames;
            RunningGameStore.getGameForPID = realGetGameForPID;
            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", progressCheck);
          }
        };
        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", progressCheck);
      }
    } else if (taskName === "STREAM_ON_DESKTOP") {
      if (!isApp) {
        console.log(`Desktop Discord required for ${questName}`);
      } else {
        let realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
        ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
          id: applicationId,
          pid,
          sourceName: null
        });
        const progressCheck = data => {
          let progress = Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
          console.log(`Progress: ${progress}/${secondsNeeded}`);
          if (progress >= secondsNeeded) {
            console.log(`Quest "${questName}" completed!`);
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", progressCheck);
          }
        };
        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", progressCheck);
      }
    } else {
      console.log(`Unsupported quest type for "${questName}".`);
    }
  }

  async function doAllQuests() {
    const quests = [...QuestsStore.quests.values()].filter(
      q => q.userStatus?.enrolledAt && !q.userStatus?.completedAt && new Date(q.config.expiresAt).getTime() > Date.now()
    );
    if (quests.length === 0) {
      console.log("No pending quests found.");
      return;
    }
    console.log(`${quests.length} quest(s) found.`);
    for (const q of quests) {
      await completeQuest(q);
      await delay(1000);
    }
    console.log("All quests have been completed.");
  }

  doAllQuests();
})();
