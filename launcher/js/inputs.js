// TV inputs, named by the user or the TV, with visibility settings for Live TV and HDMI ports.
// Selected inputs are shown full screen inside the launcher.
(function (A) {
  "use strict";

  var tz = A.tizen;
  var inputs = (A.inputs = { sources: [], watching: false });
  var listeners = [];

  inputs.subscribe = function (listener) {
    listeners.push(listener);
    return function () {
      var index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  };

  function publish() {
    listeners.slice().forEach(function (listener) {
      listener();
    });
  }

  inputs.refresh = publish;

  inputs.portName = function (s) {
    return s.type === "TV" ? "Live TV" : s.type + " " + s.number;
  };

  inputs.label = function (s, defaultLabel) {
    var port = inputs.portName(s);
    return A.settings.getSnapshot().inputNames[port] || s.editName || defaultLabel || port;
  };

  // A configured device can appear in VIDEOSOURCE.disconnected while asleep.
  // Use the TV-provided editName, never a custom AeroTizen input name, as evidence.
  inputs.hasRecognizedDevice = function (s) {
    if (!s || s.type !== "HDMI" || typeof s.editName !== "string") {
      return false;
    }
    var name = s.editName.replace(/\s+/g, " ").trim();
    if (!name) {
      return false;
    }
    var ordinary = name
      .toLowerCase()
      .replace(/[_.-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // The exact placeholder filter used in the reference HDMI implementation.
    if (
      /^(?:hdmi(?: \d+)?|ingresso(?: hdmi)?(?: \d+)?|source(?: hdmi)?(?: \d+)?|input(?: hdmi)?(?: \d+)?|sorgente(?: hdmi)?(?: \d+)?|unknown(?: device)?|unrecognized(?: device)?|unrecognised(?: device)?|dispositivo sconosciuto|sconosciuto|non riconosciuto|nessun dispositivo|no device|not connected|non collegato|disconnected)$/i.test(
        ordinary
      )
    ) {
      return false;
    }
    return true;
  };

  inputs.alwaysVisible = function (s) {
    return !!(s && s.type === "HDMI" && (A.settings.getSnapshot().hdmiKeepVisible || {})[String(s.number)] === true);
  };

  inputs.isVisible = function (s) {
    if (s.type === "TV") {
      return A.settings.getSnapshot().showLiveTv !== false;
    }
    if (s.type !== "HDMI" || A.settings.getSnapshot().hideDisconnectedHdmi !== true) {
      return true;
    }
    return s.connected === true || s.active === true || inputs.hasRecognizedDevice(s) || inputs.alwaysVisible(s);
  };

  // Connected ports first, then empty ones; Live TV last. Refreshes when something is plugged in.
  inputs.load = function () {
    if (!tz || !tz.systeminfo) {
      // desktop browser preview
      inputs.sources = [
        { type: "HDMI", number: 1, editName: "Xbox", connected: true },
        { type: "HDMI", number: 2, connected: false },
        { type: "HDMI", number: 3, editName: "PC", connected: false },
        { type: "TV", number: 1, connected: true },
      ];
      return publish();
    }
    try {
      tz.systeminfo.getPropertyValue(
        "VIDEOSOURCE",
        function (info) {
          // A selected HDMI may be reported disconnected while the TV is
          // switching sources. Reading the selected source does not imply a cable.
          var current = null;
          try {
            if (tz.tvwindow && tz.tvwindow.getSource) {
              current = tz.tvwindow.getSource("MAIN");
            }
          } catch (e) {
            /* firmware may deny this while no video window is active */
          }
          function tag(list, connected) {
            return (list || [])
              .filter(function (s) {
                return s.type !== "MEDIA";
              })
              .map(function (s) {
                var active = !!(
                  current &&
                  s.type === "HDMI" &&
                  current.type === "HDMI" &&
                  Number(current.number) === Number(s.number)
                );
                return {
                  type: s.type,
                  number: s.number,
                  editName: s.editName,
                  connected: connected || s.signal === true,
                  active: active,
                  raw: s,
                };
              });
          }
          // Keep one tile per port if firmware reports it in both lists.
          // The connected record wins; preserve a TV-recognised label if needed.
          var discovered = tag(info.connected, true).concat(tag(info.disconnected, false));
          var unique = {};
          discovered.forEach(function (s) {
            var id = String(s.type) + ":" + String(s.number),
              prior = unique[id];
            if (!prior) {
              unique[id] = s;
              return;
            }
            var preferred = !prior.connected && s.connected ? s : prior;
            var alternate = preferred === s ? prior : s;
            if (!inputs.hasRecognizedDevice(preferred) && inputs.hasRecognizedDevice(alternate)) {
              preferred.editName = alternate.editName;
            }
            unique[id] = preferred;
          });
          inputs.sources = Object.keys(unique)
            .map(function (id) {
              return unique[id];
            })
            .sort(function (a, b) {
              return (
                (a.type === "TV") - (b.type === "TV") ||
                Number(b.connected) - Number(a.connected) ||
                a.number - b.number
              );
            });
          publish();
        },
        publish
      );
    } catch (e) {
      publish();
    }
  };

  function displayLabel(s) {
    return inputs.label(s, s.type === "TV" ? A.translate("inputs.liveTv") : undefined);
  }

  inputs.show = function (s) {
    // Native Live TV owns channel selection and remote control, unlike the
    // upstream embedded TVWindow. If unsupported, preserve TVWindow fallback.
    if (
      s &&
      s.type === "TV" &&
      A.homewatch &&
      typeof A.homewatch.openNativeLiveTV === "function" &&
      A.homewatch.openNativeLiveTV(s.raw || s) !== false
    ) {
      return;
    }
    // Cinema hands HDMI to Samsung's own viewer too, so the remote reaches the
    // console over HDMI-CEC. Home there comes straight back to AeroTizen's Home.
    if (s && cinema() && handOff(s)) {
      return;
    }
    if (!tz || !tz.tvwindow) {
      return A.toast(A.translate("inputs.wouldSwitch", { input: displayLabel(s) }));
    }
    try {
      tz.tvwindow.setSource(
        s.raw || s,
        function () {
          tz.tvwindow.show(
            function () {
              current = s;
              inputs.watching = true;
              document.body.classList.add("tv");
              document.documentElement.style.background = "transparent";
              window.Backgrounds.suspend();
            },
            function () {
              A.toast(A.translate("inputs.couldNotShow", { input: displayLabel(s) }));
            },
            FULL_SCREEN,
            "MAIN"
          );
        },
        function () {
          A.toast(A.translate("inputs.switchFailed"));
        },
        "MAIN"
      );
    } catch (e) {
      A.toast(A.translate("inputs.switchFailed"));
    }
  };

  var FULL_SCREEN = ["0px", "0px", "1920px", "1080px"];
  // The input on screen: embedded here while `watching`, or handed to Samsung's viewer.
  var current = null,
    handedOff = null;
  // One Home press can arrive as an appcontrol event and a visibility change.
  var HOME_SETTLE_MS = 1000;

  function cinema() {
    return A.settings.getSnapshot().cinemaUi === true;
  }
  function sourceKey(s) {
    return "input:" + s.type + ":" + s.number;
  }
  function hideWindow() {
    try {
      tz.tvwindow.hide(
        function () {},
        function () {},
        "MAIN"
      );
    } catch (e) {
      /* already hidden */
    }
  }

  function handOff(s) {
    if (!A.homewatch || typeof A.homewatch.openNativeLiveTV !== "function") {
      return false;
    }
    if (A.homewatch.openNativeLiveTV(s.raw || s) === false) {
      return false;
    }
    current = s;
    handedOff = s;
    return true;
  }

  inputs.peeking = false;

  // Embedded picture (non-Cinema fallback): Left or Home opens the panel over it.
  inputs.openPanel = function () {
    if (!inputs.watching || inputs.peeking || !current || !A.homeScreen || !A.homeScreen.peekInput) {
      return;
    }
    inputs.peeking = true;
    document.body.classList.add("tv-panel");
    A.homeScreen.peekInput(sourceKey(current));
  };

  inputs.endPeek = function () {
    inputs.peeking = false;
    document.body.classList.remove("tv-panel");
  };

  inputs.leave = function () {
    inputs.endPeek();
    current = null;
    handedOff = null;
    inputs.watching = false;
    document.body.classList.remove("tv");
    A.applyBackground();
    hideWindow();
  };

  var homeAt = 0;
  function homePressed() {
    var now = Date.now();
    if (now - homeAt < HOME_SETTLE_MS) {
      return;
    }
    homeAt = now;
    if (handedOff && !inputs.peeking) {
      // Back from Samsung's viewer: AeroTizen's Home, with the side panel closed.
      handedOff = null;
      current = null;
      if (A.homeScreen && A.homeScreen.closePanel) {
        A.homeScreen.closePanel();
      }
    } else if (inputs.peeking) {
      // Home again: AeroTizen's own Home.
      inputs.leave();
      if (A.homeScreen && A.homeScreen.closePanel) {
        A.homeScreen.closePanel();
      }
    } else if (inputs.watching && cinema()) {
      inputs.openPanel();
    } else if (inputs.watching) {
      inputs.leave();
    }
  }

  function isMainLaunch() {
    try {
      var request = tz.application.getCurrentApplication().getRequestedAppControl();
      return !!(
        request &&
        request.appControl &&
        request.appControl.operation === "http://tizen.org/appcontrol/operation/main"
      );
    } catch (e) {
      return false;
    }
  }

  // Native Home targets this already-running app: from the embedded picture, or from
  // Samsung's viewer after a Cinema handoff.
  window.addEventListener("appcontrol", function () {
    if (!(inputs.watching || handedOff || inputs.peeking) || !tz || !tz.application) {
      return;
    }
    if (isMainLaunch()) {
      homePressed();
    }
  });

  // Some firmware resumes an existing Home without an appcontrol event.
  var inputWasHidden = false;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      inputWasHidden = inputs.watching || !!handedOff;
      return;
    }
    if (inputWasHidden && (inputs.watching || handedOff)) {
      homePressed();
    }
    inputWasHidden = false;
  });

  if (tz && tz.systeminfo) {
    try {
      tz.systeminfo.addPropertyValueChangeListener("VIDEOSOURCE", inputs.load);
    } catch (e) {
      /* not supported */
    }
  }
})(window.AeroTizen);
