/* 今回はUIでhost,roomKey,displayNameなどを入力できるようにするため、代入処理部分はコメントアウトしています。
var host = "tenant-staging-vcubeio.vcube.com";
var roomKey = "FfvmAOxOlA";
var displayName = "TestConnector";
var roomPin = "";
*/
const LOCAL_CAMERA_SLOT = "1";
const OPEN_REMOTE_SLOT = "-1";
const SHARING_SLOT_NUM = "1";
var vidyoClient,vidyoConnector;

class Connector {
    remoteSources = { max: 8, count: 0, rendered: 0 };
    // this.rendererSlots[0] is used to render the local camera;
    // this.rendererSlots[8] is used to render the remote sharing;
    // this.rendererSlots[1] through this.remoteSources[7] are used to render up to 7 cameras from remote participants.
    rendererSlots = [
        LOCAL_CAMERA_SLOT,
        OPEN_REMOTE_SLOT,
        OPEN_REMOTE_SLOT,
        OPEN_REMOTE_SLOT,
        OPEN_REMOTE_SLOT,
        OPEN_REMOTE_SLOT,
        OPEN_REMOTE_SLOT,
        OPEN_REMOTE_SLOT,
        SHARING_SLOT_NUM,
    ];

    remoteCameras = {};

        constructor() {
        this.vidyoClient = new VidyoClientLib.VidyoClient(
            "VidyoClientPlugIn",
            this.onLoadedCallback
        );
    }
    onLoadedCallback(args) {
        console.dir(args);
    }

    async initConnector() {
        this.vidyoConnector = await this.vidyoClient.CreateVidyoConnector({
            viewId: null, // Div ID where the composited video will be rendered, see VidyoConnector.html
            viewStyle: "VIDYO_CONNECTORVIEWSTYLE_Default", // Visual style of the composited renderer
            remoteParticipants: 8, // Maximum number of participants to render
            logFileFilter: "all@VidyoDevelopment debug@VidyoClient debug@VidyoSDP debug@VidyoResourceManager all@VidyoSignaling",
            logFileName: "",
            userData: ""
        });

        // register some event listener
        await Promise.all([
            this.registerRemoteCameraEventListener(),
            this.registerLocalWindowShareEventListener(),
            this.registerRemoteWindowShareEventListener(),
        ]).catch(e => {
            console.dir(e);
        });

        // 数秒待たないとconnectToConferenceに失敗する
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 2000);
        });
    }

    registerLocalCameraEventListener(onAdded, onRemoved, onSelected, onStateUpdated) {
        const cameras = (this.cameras = []);
        this.vidyoConnector.RegisterLocalCameraEventListener({
            onAdded: function(localCamera) {
                cameras[localCamera.id] = localCamera;
                onAdded({ id: localCamera.id, name: localCamera.name });
                console.log( localCamera.name + "(" + localCamera.id + ")" + " has been added");
            },
            onRemoved: function(localCamera) {
                delete cameras[localCamera.id];
                onRemoved({ id: localCamera.id });
            },
            onSelected: (localCamera) => {
                this.localCamera = localCamera
                this.applyConstraint(localCamera, this.constraint)
                if (localCamera) {
                    onSelected({ id: localCamera.id });
                    // Assign view to selected camera
                    this.vidyoConnector
                        .AssignViewToLocalCamera({
                            viewId: "renderer0",
                            localCamera: localCamera,
                            displayCropped: true,
                            allowZoom: false
                        })
                        .then(() => {
                            console.log("AssignViewToLocalCamera Success");
                            this.ShowRenderer(vidyoConnector, "renderer0");
                        })
                        .catch(function(e) {
                            console.log("AssignViewToLocalCamera Failed");
                        });
                }
            },
            onStateUpdated: (localCamera, state) => {
                onStateUpdated({ state });
            }
        }).then(function() {
            console.log("RegisterLocalCameraEventListener Success");
        }).catch(function() {
            console.error("RegisterLocalCameraEventListener Failed");
        });
    }
    
    selectLocalCamera(cameraId) {
        const camera = this.cameras[cameraId];
        this.vidyoConnector
            .SelectLocalCamera({
                localCamera: camera
            })
            .then(function() {
                console.log("SelectCamera Success");
            })
            .catch(function() {
                console.error("SelectCamera Failed");
            });
    }

    setCameraPrivacy({privacy}) {
        return this.vidyoConnector.SetCameraPrivacy({privacy});
    }

    registerLocalMicrophoneEventListener(onAdded, onRemoved, onSelected, onStateUpdated) {
        const microphones = (this.microphones = []);
        this.vidyoConnector.RegisterLocalMicrophoneEventListener({
            onAdded: function(localMicrophone) {
                microphones[localMicrophone.id] = localMicrophone;
                onAdded({ id: localMicrophone.id, name: localMicrophone.name });
            },
            onRemoved: function(localMicrophone) {
                delete microphones[localMicrophone.id];
                onRemoved({ id: localMicrophone.id });
            },
            onSelected: function(localMicrophone) {
                if (localMicrophone) {
                    onSelected({ id: localMicrophone.id });
                }
            },
            onStateUpdated: (localMicrophone, state) => {
                onStateUpdated({ state });
            }
        }).then(function() {
            console.log("RegisterLocalMicrophoneEventListener Success");
        }).catch(function() {
            console.error("RegisterLocalMicrophoneEventListener Failed");
        });
    }

    selectLocalMicrophone(microphoneId) {
        const microphone = this.microphones[microphoneId];
        this.vidyoConnector
            .SelectLocalMicrophone({
                localMicrophone: microphone
            })
            .then(function() {
                console.log("SelectMicrophone Success");
            })
            .catch(function() {
                console.error("SelectMicrophone Failed");
            });
    }

    setMicrophonePrivacy({privacy}) {
        return this.vidyoConnector.SetMicrophonePrivacy({privacy});
    }

    registerLocalSpeakerEventListener(onAdded, onRemoved, onSelected, onStateUpdated) {
        const speakers = (this.speakers = []);
        this.vidyoConnector.RegisterLocalSpeakerEventListener({
            onAdded: function(localSpeaker) {
                speakers[localSpeaker.id] = localSpeaker;
                onAdded({ id: localSpeaker.id, name: localSpeaker.name });
            },
            onRemoved: function(localSpeaker) {
                delete speakers[localSpeaker.id];
                onRemoved({ id: localSpeaker.id });
            },
            onSelected: function(localSpeaker) {
                if (localSpeaker) {
                    onSelected({ id: localSpeaker.id });
                }
            },
            onStateUpdated: (localSpeaker, state) => {
                onStateUpdated({ state });
            }
        });
    }

    selectLocalSpeaker(speakerId) {
        const speaker = this.speakers[speakerId];
        this.vidyoConnector
            .SelectLocalSpeaker({
                localSpeaker: speaker
            })
            .then(function() {
                console.log("SelectSpeaker Success");
            })
            .catch(function() {
                console.error("SelectSpeaker Failed");
            });
    }

    setSpeakerPrivacy({privacy}) {
        return this.vidyoConnector.SetSpeakerPrivacy({privacy});
    }

    //画面共有
    registerLocalWindowShareEventListener() {
        vidyoConnector.RegisterLocalWindowShareEventListener({
            onAdded: (localWindowShare) => {
                // 受け取ったlocalWindowShareをSelectLocalWindowShareにわたすと、ブラウザの画面共有選択ポップアップが開く
                this.localShare = localWindowShare;
                console.log("Window share added, name : " + localWindowShare.name + " | id : " + window.btoa(localWindowShare.id));
            },
            onRemoved: (localWindowShare) => {
                console.log("Window share removed, name : " + localWindowShare.name + " | id : " + window.btoa(localWindowShare.id));
            },
            onSelected: (localWindowShare) => {
                if (localWindowShare) {
                    console.log("Window share selected, name : " + localWindowShare.name + " | id : " + window.btoa(localWindowShare.id));
                }
            },
            onStateUpdated: (localWindowShare, state) => {
                console.log("Window share state updated, name : " + localWindowShare.name + " | id : " + window.btoa(localWindowShare.id));
            }
        }).then(function() {
            console.log("RegisterLocalWindowShareEventListener Success");
        }).catch(function() {
            console.error("RegisterLocalWindowShareEventListener Failed");
        });
    }
    // 最新の画面共有を１つだけ表示する
    registerRemoteWindowShareEventListener() {
        // 疑似スタック 配列の最後尾が表示対象
        let remoteShareStack = [];
        this.vidyoConnector
            .RegisterRemoteWindowShareEventListener({
                onAdded: async (remoteWindowShare, participant) => {
                    // 画面共有を表示していれば消す
                    if (remoteShareStack.length) {
                        await this.vidyoConnector
                            .HideView({ viewId: "renderer8" })
                            .then(function () {
                                console.log("HideView Success");
                            })
                            .catch(function (e) {
                                console.log("HideView Failed");
                            });
                    }

                    remoteShareStack.push(remoteWindowShare);
                    await this.vidyoConnector
                        .AssignViewToRemoteWindowShare({
                            viewId: "renderer8",
                            remoteWindowShare: remoteWindowShare,
                            displayCropped: false,
                            allowZoom: false,
                        })
                        .then(retValue => {
                            console.log(
                                "AssignViewToRemoteWindowShare " +
                                participant.id +
                                " to slot S " +
                                retValue
                            );
                            this.ShowRenderer(vidyoConnector, "renderer8");
                        })
                        .catch(function (e) {
                            console.log("AssignViewToRemoteWindowShare Failed");
                        });
                },
                onRemoved: async (remoteWindowShare, participant) => {
                    const isCurrentShareRemoved =
                        remoteShareStack.slice(-1)[0].id ===
                        remoteWindowShare.id;
                    remoteShareStack = remoteShareStack.filter(share => {
                        return share.id !== remoteWindowShare.id;
                    });

                    if(!isCurrentShareRemoved) return;

                    // 現在の画面共有を消す
                    await vidyoConnector
                        .HideView({ viewId: "renderer8" })
                        .then(function () {
                            console.log("HideView Success");
                        })
                        .catch(function (e) {
                            console.log("HideView Failed");
                        });

                    // 他の画面共有があれば表示する
                    if (remoteShareStack.length) {
                        this.vidyoConnector
                            .AssignViewToRemoteWindowShare({
                                viewId: "renderer8",
                                remoteWindowShare: remoteShareStack.slice(-1)[0],
                                displayCropped: false,
                                allowZoom: false,
                            })
                            .then(retValue => {
                                console.log(
                                    "AssignViewToRemoteWindowShare " +
                                    participant.id +
                                    " to slot S " +
                                    retValue
                                );
                                this.ShowRenderer(vidyoConnector, "renderer8");
                            })
                            .catch(function () {
                                console.log("AssignViewToRemoteWindowShare Failed");
                            });
                    }
                },
                onStateUpdated: function (
                    remoteWindowShare,
                    participant,
                    state
                ) {
                    console.log(
                        "Remote window share state updated, name : " +
                        remoteWindowShare.name +
                        " | id : " +
                        window.btoa(remoteWindowShare.id)
                    );
                },
            })
            .then(function () {
                console.log("RegisterRemoteWindowShareEventListener Success");
            })
            .catch(function () {
                console.error("RegisterRemoteWindowShareEventListener Failed");
        });
    }

    openSharingSelectionPopup() {
        return this.vidyoConnector.SelectLocalWindowShare({
            localWindowShare: this.localShare
        })
    };

    stopSharing() {
        return this.vidyoConnector.SelectLocalWindowShare({
            localWindowShare: null
        })
    };

    //リモート映像表示
    registerRemoteCameraEventListener() {
        return this.vidyoConnector.RegisterRemoteCameraEventListener({
            onAdded: (camera, participant) => { //リモートカメラオブジェクトが追加された際の処理
                console.dir("RegisterRemoteCameraEventListener onAdded");
                // Store the remote camera for this participant
                this.remoteCameras[participant.id] = { camera: camera, isRendered: false };
                ++this.remoteSources.count;

                // Check if resource manager allows for an additional source to be rendered.
                console.dir(this.remoteSources.rendered)
                console.dir(this.remoteSources.max)

                if (this.remoteSources.rendered < this.remoteSources.max) { //予め用意したレンダースロットに空きがあるか
                    // If an open slot is found then assign it to the remote camera.
                    var openSlot = this.findOpenSlot();
                    console.dir(openSlot)
                    if (openSlot > 0) {
                        this.renderToSlot(
                            this.vidyoConnector,
                            this.remoteCameras,
                            participant.id,
                            openSlot
                        );
                    }
                }
            },
            onRemoved: (camera, participant) => { //リモートカメラオブジェクトがRemoveされた際の処理
                console.log(
                    "RegisterRemoteCameraEventListener onRemoved participant.id : " + participant.id
                );
                delete this.remoteCameras[participant.id];
                --this.remoteSources.count;

                // レンダースロットをスキャンして、このリモートカメラが表示されていたか確認
                // あればスロットをクリアし、カメラを非表示にする（しないとフリーズ映像がそのまま表示される）
                for (var i = 1; i < this.rendererSlots.length; i++) {
                    if (this.rendererSlots[i] === participant.id) {
                        this.rendererSlots[i] = OPEN_REMOTE_SLOT;
                        console.log("Slot found, calling HideView on renderer" + i);
                        this.vidyoConnector
                            .HideView({ viewId: "renderer" + i })
                            .then(() => {
                                console.log("HideView Success");
                                --this.remoteSources.rendered;//レンダーされているリモートカメラ配列から1減
                                for (var id in this.remoteCameras) {
                                    if (!this.remoteCameras[id].isRendered) {
                                        this.renderToSlot(
                                            this.vidyoConnector,
                                            this.remoteCameras,
                                            id,
                                            i
                                        );
                                        break;
                                    }
                                }
                            })
                            .catch(function(e) {
                                console.log("HideView Failed");
                            });
                        break;
                    }
                }
            },
            onStateUpdated: () => {}
        });
    }

    connectToConference(host, roomKey, displayName, roomPin) {
        console.log("connectToConference");
        this.vidyoConnector
            .ConnectToRoomAsGuest({
                host,
                roomKey,
                displayName,
                roomPin: roomPin,
                onSuccess: () => {
                    console.log("Connect Success");
                },
                onFailure: () => {
                    console.log("onFailure called!!");
                    // 接続に失敗した際にレンダースロットとリモートカメラを手動でクリアする必要がある
                    // この処理はConnectメソッドのonFailure/onDisconnectedだけでなくRegisterRemoteCameraEventListener onRemovedにも追加する必要がある
                    for (var i = 1; i < this.rendererSlots.length; i++) {
                        if (this.rendererSlots[i] != OPEN_REMOTE_SLOT) {
                            this.rendererSlots[i] = OPEN_REMOTE_SLOT;
                            console.log("Calling HideView on renderer" + i);
                            this.vidyoConnector.HideView({ viewId: "renderer" + (i) }).then(function() {
                                console.log("HideView Success");
                            }).catch(function(e) {
                                console.log("HideView Failed");
                            });
                        }
                    }
                    this.remoteCameras = {};
                },
                onDisconnected: () => {
                    console.log("onDisconnected called!!");
                    // 接続に失敗した際にレンダースロットとリモートカメラを手動でクリアする必要がある
                    for (var i = 1; i < this.rendererSlots.length; i++) {
                        if (this.rendererSlots[i] != OPEN_REMOTE_SLOT) {
                            this.rendererSlots[i] = OPEN_REMOTE_SLOT;
                            console.log("Calling HideView on renderer" + i);
                            this.vidyoConnector.HideView({ viewId: "renderer" + (i) }).then(function() {
                                console.log("HideView Success");
                            }).catch(function(e) {
                                console.log("HideView Failed");
                            });
                        }
                    }
                    this.remoteCameras = {};
                }
            })
    }
    disconnect() {
        this.vidyoConnector.Disconnect().then(function() {
            console.log("Disconnect Success");
        }).catch(function() {
            console.error("Disconnect Failure");
        });
    }

    // ShowViewAtを使ってDivにカメラをレンダーする処理
    ShowRenderer(vidyoConnector, divId) {
        var rndr = document.getElementById(divId);
        vidyoConnector.ShowViewAt({
            viewId: divId,
            x: rndr.offsetLeft,
            y: rndr.offsetTop,
//            width: rndr.offsetWidth,
//            height: rndr.offsetHeight
            width:3840, //通常は↑のrndr.offsetWidthでOKだが、解像度を高くしたいと言う要望が多いためデフォルトで最大値をセットしている
            height:3840 //通常は↑のrndr.offsetHeightでOKだが、解像度を高くしたいと言う要望が多いためデフォルトで最大値をセットしている
        });
    }

    // 受信映像をレンダーするスロットをスキャン (1 - 8)
    findOpenSlot() {
        for (var i = 1; i < this.rendererSlots.length; ++i) {
            if (this.rendererSlots[i] === OPEN_REMOTE_SLOT) return i;
        }
        return 0;
    }

    // リモートカメラにAssignViewを使ってDivをアサインする
    renderToSlot(vidyoConnector, remoteCameras, participantId, slot) {
        // Render the remote camera to the slot.
        this.rendererSlots[slot] = participantId;
        this.remoteCameras[participantId].isRendered = true;
        vidyoConnector
            .AssignViewToRemoteCamera({
                viewId: "renderer" + slot,//renderer1-8
                remoteCamera: this.remoteCameras[participantId].camera,
                displayCropped: true,
                allowZoom: true //この部分はWebRTCでは機能していない（displayCroppedも）
            })
            .then((retValue) =>{
                console.log(
                    "AssignViewToRemoteCamera " +
                        participantId +
                        " to slot " +
                        slot +
                        " = " +
                        retValue
                );
                this.ShowRenderer(vidyoConnector, "renderer" + slot);
                ++this.remoteSources.rendered;
            })
            .catch(() => {
                console.log("AssignViewToRemoteCamera Failed");
                this.rendererSlots[slot] = OPEN_REMOTE_SLOT;
                this.remoteCameras[participantId].isRendered = false;
            });
    }

    setConstraint({width, height, fps}) {
        // fpsをそのまま渡せば良さそう
        const frameInterval = fps// * 1e8;
        this.constraint = { width, height, frameInterval };

        this.applyConstraint(this.localCamera, this.constraint);
    }

    applyConstraint(localCamera, constraint) {
        if (localCamera && constraint) {
            localCamera.SetMaxConstraint({...constraint});
        }
    }
    showStatsInConsole() {
        this.vidyoConnector.GetStatsJson().then(statsJson => {
            console.dir(JSON.parse(statsJson));
        })
    }
}
