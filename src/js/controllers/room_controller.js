import { Controller } from "stimulus"
import { Janus } from "janus-gateway"
import videojs from "video.js"

export default class extends Controller {
  static targets = ["top", "bottom", "mute"];
  janus
  screentest
  pin
  opaqueId
  myId
  myPrivateId
  feeds
  room
  streaming

  connect() {
    this.feeds = [];
    this.opaqueId = Janus.randomString(12);
    this.room = Number(this.data.get("janus-id"));
    const controller = this;

    if(window.location.hash) {
      this.pin = window.location.hash.substr(1);
    } else {
      this.pin = prompt("Enter PIN:");
    }
    
    if (this.pin != null) {
      Janus.init({
        debug: "all",
        callback: function() {
          controller.start();
        }
      });

    }
  }

  disconnect() {
    if (this.janus != null) this.stop();
  }

  start() {
    const controller = this;

    let server = null;
    if(window.location.protocol === 'http:')
      server = "http://" + window.location.hostname + ":8088/janus";
    else
      server = "/janus";

    // Make sure the browser supports WebRTC
    if(!Janus.isWebrtcSupported()) {
      alert("No WebRTC support... ");
      return;
    }
    // Create session
    this.janus = new Janus({
      server: server,
      success: function() {
        controller.setupMainStage();
        // Attach to VideoRoom plugin
        controller.janus.attach({
          plugin: "janus.plugin.videoroom",
          opaqueId: controller.opaqueId,
          success: function(pluginHandle) {
            controller.screentest = pluginHandle;
            Janus.log("Plugin attached! (" + controller.screentest.getPlugin() + ", id=" + controller.screentest.getId() + ")");
            const register = {
              "request": "join",
              "room": controller.room,
              "pin": controller.pin,
              "ptype": "publisher",
              "display": Janus.randomString(8)
            };
            controller.screentest.send({"message": register});
          },
          error: function(error) {
            Janus.error("  -- Error attaching plugin...", error);
            alert("Error attaching plugin... " + error);
          },
          consentDialog: function(on) {
            Janus.debug("Consent dialog should be " + (on ? "on" : "off") + " now");
          },
          webrtcState: function(on) {
            Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
            if(on) {
            } else {
              controller.stop();
            }
          },
          onmessage: function(msg, jsep) {
            Janus.debug(" ::: Got a message (publisher) :::");
            Janus.debug(msg);
            const event = msg["videoroom"];
            Janus.debug("Event: " + event);
            if(event != undefined && event != null) {
              if(event === "joined") {
                controller.myId = msg["id"];
                controller.myPrivateId = msg["private_id"];
                Janus.log("Successfully joined room " + msg["room"] + " with ID " + controller.myId);
                // This is our session, publish our stream
                Janus.debug("Negotiating WebRTC stream for our video.");
                controller.screentest.createOffer({
                  media: { videoSend: true, audioSend: true, videoRecv: false, audioRecv: false},
                  success: function(jsep) {
                    Janus.debug("Got publisher SDP!");
                    Janus.debug(jsep);
                    let publish = { "request": "configure", "audio": true, "video": true };
                    controller.screentest.send({"message": publish, "jsep": jsep});
                  },
                  error: function(error) {
                    Janus.error("WebRTC error:", error);
                    alert("WebRTC error... " + JSON.stringify(error));
                  }
                });
                if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                  controller.addRemoteFeeds(msg["publishers"]);
                }
              } else if(event === "event") {
                // Any feed to attach to?
                if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                  controller.addRemoteFeeds(msg["publishers"]);
                } else if(msg["leaving"] !== undefined && msg["leaving"] !== null) {
                  // One of the publishers has gone away?
                  const leaving = msg["leaving"];
                  controller.removeRemoteFeed(leaving);
                } else if(msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                  const unpublished = msg["unpublished"];
                  controller.removeRemoteFeed(unpublished);
                }
                if(msg["error"] !== undefined && msg["error"] !== null) {
                  alert(msg["error"]);
                }
              }
            }
            if(jsep !== undefined && jsep !== null) {
              Janus.debug("Handling SDP as well...");
              Janus.debug(jsep);
              controller.screentest.handleRemoteJsep({jsep: jsep});
            }
          },
          onlocalstream: function(stream) {
            Janus.debug(" ::: Got a local stream :::");
            Janus.debug(stream);
            const container = document.createElement("div");
            container.classList.add("localvideo", "col-3");
            const video = document.createElement("video");
            video.autoplay = "autoplay";
            video.muted = true;
            container.appendChild(video);
            const muteButton = document.createElement("button");
            muteButton.classList.add("mute-button", "btn", "btn-sm", "btn-light");
            const icon = document.createElement("i");
            icon.classList.add("fas", "fa-volume-up");
            icon.setAttribute("data-target", "room.mute");
            muteButton.setAttribute("data-action", "click->room#toggleMuted");
            muteButton.appendChild(icon);
            container.appendChild(muteButton);
            if (controller.bottomTarget.childNodes.length <= controller.topTarget.childNodes.length) {
              controller.bottomTarget.appendChild(container);
            } else {
              controller.topTarget.appendChild(container);
            }
            Janus.attachMediaStream(video, stream);
          },
          onremotestream: function(stream) {
            // The publisher stream is sendonly, we don't expect anything here
          },
          oncleanup: function() {
            Janus.log(" ::: Got a cleanup notification :::");
          }
        });
      },
      error: function(error) {
        Janus.error(error);
        alert(error);
      },
      destroyed: function() {
        window.location.reload();
      }
    });
  }

  stop() {
    this.janus.destroy();
  }

  addRemoteFeeds(publishers) {
    for(const f in publishers) {
      const id = publishers[f]["id"];
      const display = publishers[f]["display"];
      const audio = publishers[f]["audio_codec"];
      const video = publishers[f]["video_codec"];
      Janus.debug("  >> [" + id + "] " + display + " (audio: " + audio + ", video: " + video + ")");
      this.newRemoteFeed(id, display, audio, video);
    }
  }

  newRemoteFeed(id, display, audio, video) {
    let remoteFeed = null;
    const controller = this;
    this.janus.attach({
      plugin: "janus.plugin.videoroom",
      opaqueId: this.opaqueId,
      success: function(pluginHandle) {
        remoteFeed = pluginHandle;
        remoteFeed.simulcastStarted = false;
        Janus.log("Plugin attached! (" + remoteFeed.getPlugin() + ", id=" + remoteFeed.getId() + ")");
        Janus.log("  -- This is a subscriber");
        const subscribe = {
          "request": "join",
          "room": controller.room,
          "pin": controller.pin,
          "ptype": "subscriber",
          "feed": id,
          "private_id": controller.myPrivateId
        };
        remoteFeed.videoCodec = video;
        remoteFeed.send({"message": subscribe});
      },
      error: function(error) {
        Janus.error("  -- Error attaching plugin...", error);
      },
      onmessage: function(msg, jsep) {
        Janus.debug(" ::: Got a message (subscriber) :::");
        Janus.debug(msg);
        const event = msg["videoroom"];
        Janus.debug("Event: " + event);
        if(msg["error"] !== undefined && msg["error"] !== null) {
          Janus.error(msg["error"]);
        } else if(event != undefined && event != null) {
          const feeds = controller.feeds;
          if(event === "attached") {
            // Subscriber created and attached
            for(let i=1;i<=8;i++) {
              if(feeds[i] === undefined || feeds[i] === null) {
                feeds[i] = remoteFeed;
                remoteFeed.rfindex = i;
                break;
              }
            }
            remoteFeed.rfid = msg["id"];
            remoteFeed.rfdisplay = msg["display"];
            Janus.log("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
          } else if(event === "event") {
            // Unhandled for now
          }
        }
        if(jsep !== undefined && jsep !== null) {
          Janus.debug("Handling SDP as well...");
          Janus.debug(jsep);
          // Answer and attach
          remoteFeed.createAnswer({
            jsep: jsep,
            media: { audioSend: false, videoSend: false },  // We want recvonly audio/video
            success: function(jsep) {
              Janus.debug("Got SDP!");
              Janus.debug(jsep);
              const body = { "request": "start", "room": controller.room };
              remoteFeed.send({"message": body, "jsep": jsep});
            },
            error: function(error) {
              Janus.error("WebRTC error:", error);
            }
          });
        }
      },
      webrtcState: function(on) {
        Janus.log("Janus says this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") is " + (on ? "up" : "down") + " now");
      },
      onlocalstream: function(stream) {
        // The subscriber stream is recvonly, we don't expect anything here
      },
      onremotestream: function(stream) {
        Janus.debug("Remote feed #" + remoteFeed.rfindex);
        let videoTag = document.getElementById("remote-" + remoteFeed.rfindex);
        if (videoTag == null) videoTag = controller.createVideoTag("remote-" + remoteFeed.rfindex);
        Janus.attachMediaStream(videoTag, stream);
      },
      oncleanup: function() {
        Janus.log(" ::: Got a cleanup notification (remote feed " + id + ") :::");
      }
    });
  }

  removeRemoteFeed(remoteId) {
    Janus.log("Publisher left: " + remoteId);
    let remoteFeed = null;

    const feeds = this.feeds;
    for(let i=1; i<=8; i++) {
      if(feeds[i] != null && feeds[i] != undefined && feeds[i].rfid == remoteId) {
        remoteFeed = feeds[i];
        break;
      }
    }
    if(remoteFeed != null) {
      Janus.debug("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
      const container = document.getElementById("remote-" + remoteFeed.rfindex);
      container.parentNode.removeChild(container);
      feeds[remoteFeed.rfindex] = null;
      remoteFeed.detach();
    }
  }

  createVideoTag(id = null) {
    const container = document.createElement("div");
    container.classList.add("col-3");
    container.id = id;
    const video = document.createElement("video");
    video.autoplay = "autoplay";
    container.appendChild(video);
    if (this.bottomTarget.childNodes.length <= this.topTarget.childNodes.length) {
      this.bottomTarget.appendChild(container);
    } else {
      this.topTarget.appendChild(container);
    }
    return video;
  }

  setupMainStage() {
    const controller = this;
    const video = document.getElementById('main-stage-video');
    video.autoplay = true;
    this.janus.attach({
      plugin: "janus.plugin.streaming",
      opaqueId: this.opaqueId,
      success: function(pluginHandle) {
        controller.streaming = pluginHandle;
        Janus.log("Plugin attached! (" + pluginHandle.getPlugin() + ", id=" + pluginHandle.getId() + ")");
        const body = {
          request: "watch",
          id: controller.room,
          pin: controller.pin,
        };
        pluginHandle.send({message: body});
      },
      error: function(error) {
        Janus.error("  -- Error attaching plugin... ", error);
      },
      onmessage: function(msg, jsep) {
        Janus.debug(" ::: Got a message :::");
        Janus.debug(msg);
        if(jsep !== undefined && jsep !== null) {
          Janus.debug("Handling SDP as well...");
          Janus.debug(jsep);
          const stereo = (jsep.sdp.indexOf("stereo=1") !== -1);
          // Offer from the plugin, let's answer
          controller.streaming.createAnswer({
            jsep: jsep,
            // We want recvonly audio/video and, if negotiated, datachannels
            media: { audioSend: false, videoSend: false, data: true },
            customizeSdp: function(jsep) {
              if(stereo && jsep.sdp.indexOf("stereo=1") == -1) {
                // Make sure that our offer contains stereo too
                jsep.sdp = jsep.sdp.replace("useinbandfec=1", "useinbandfec=1;stereo=1");
              }
            },
            success: function(jsep) {
              Janus.debug("Got SDP!");
              Janus.debug(jsep);
              const body = { "request": "start" };
              controller.streaming.send({"message": body, "jsep": jsep});
            },
            error: function(error) {
              Janus.error("WebRTC error:", error);
            }
          });
        }
      },
      onremotestream: function(stream) {
        Janus.debug(" ::: Got a remote stream :::");
        Janus.debug(stream);
        Janus.attachMediaStream(video, stream);
      }
    });
  }

  toggleMuted() {
    const muted = this.screentest.isAudioMuted();
    Janus.log((muted ? "Unmuting" : "Muting") + " local stream...");
    if (muted) {
      this.screentest.unmuteAudio();
      this.muteTarget.classList.remove("fa-volume-mute");
      this.muteTarget.classList.add("fa-volume-up");
      this.muteTarget.parentNode.classList.remove("btn-danger");
      this.muteTarget.parentNode.classList.remove("btn-light");
    } else {
      this.screentest.muteAudio();
      this.muteTarget.classList.remove("fa-volume-up");
      this.muteTarget.classList.add("fa-volume-mute");
      this.muteTarget.parentNode.classList.remove("btn-light");
      this.muteTarget.parentNode.classList.add("btn-danger");
      this.muteTarget.parentNode.classList.remove("btn-light");
    }
  }
}
