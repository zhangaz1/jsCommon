;
(function(netBrain) {
    'use strict';

    var nsName = netBrain.NetworkOS.Const.NS_NAME;

    EventSwitchSrvc.$inject = ['$rootScope', 'nb.networkos.myFilesSrvc'];

    netBrain.nbNetworkOs
        .service(nsName + '.eventSwitchSrvc', EventSwitchSrvc);

    function EventSwitchSrvc($rootScope, myFilesSrvc) {
        var events = netBrain.NetworkOS.Events;
        var consts = netBrain.NetworkOS.Const;
        var folderTypes = consts.FolderType;
        var fileTypes = consts.BuiltInFileType
        var sessions = [];
        var watchers = [];

        return {
            start: start,
            stop: stop
        };

        function start() {
            var switchConfigs = getSwitchConfigs();

            watchers = _.map(switchConfigs, function(config) {
                return addEventWatcher(
                    config.eventName,
                    config.handler
                );
            });

            var sessionId = NgUtil.getGUID();
            sessions.push(sessionId);
            return sessionId;
        }

        function stop(sessionId) {
            var index = _.indexOf(sessions, sessionId);
            sessions.splice(index, 1);

            if (sessions.length < 1) {
                _.each(watchers, function(cancel) {
                    cancel();
                });
            }
        }

        /// --- utils ---------------

        function addEventWatcher(eventName, handler) {
            return $rootScope.$on(
                eventName,
                handler
            );
        }

        function getSwitchConfigs() {
            return [{
                eventName: systemEvent.changedDomain,
                handler: function(event) {
                    broadcast(events.MY_FILES_REINIT, {});
                }
            }, {
                eventName: systemEvent.changedTenant,
                handler: function(event) {
                    broadcast(events.MY_FILES_REINIT, {});
                }
            }, {
                eventName: events.MY_FILES_REFRESH,
                handler: function(event, data) {
                    var folder = data.folder;
                    var newData = {
                        folder: folder,
                        originalEvent: event,
                        originalData: data
                    };

                    if (folder && folder.type === folderTypes.SHARE_WITH_ME) {
                        broadcast(events.MY_FILES_REFRESH_SHARE_WITH_ME, newData);
                    } else {
                        broadcast(events.MY_FILES_NAVIGATE_TO_FOLDER, newData);
                    }
                }
            }, {
                eventName: events.MY_FILES_SHOW_IN_DESKTOP_SUCCESS,
                handler: function(event, data) {
                    broadcast(events.MY_FILES_REFRESH_FILE_LIST, {
                        folder: myFilesSrvc.getDesktopFolderInCache(),
                        originalEvent: event,
                        originalData: data
                    });
                }
            }, {
                eventName: events.MY_FILES_FOLDER_SELECTED,
                handler: function(event, data) {
                    // broadcast(events.MY_FILES_REFRESH_FILE_LIST, {
                    //     selectedFolder: data.selectedFolder,
                    //     originalEvent: event,
                    //     originalData: data
                    // });
                }
            }, {
                eventName: events.MY_FILES_RENAME_FOLDER_SUCCESS,
                handler: function(event, data) {
                    var folder = data.folder;
                    myFilesSrvc
                        .getFolderById(folder.parent.id)
                        .then(function(parentFolder) {
                            broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, {
                                folder: parentFolder,
                                originalEvent: event,
                                originalData: data
                            });
                        });
                }
            }, {
                eventName: events.MY_FILES_ADD_SUB_FOLDER_SUCCESS,
                handler: function(event, data) {
                    broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, {
                        folder: data.folder,
                        originalEvent: event,
                        originalData: data
                    });
                }
            }, {
                eventName: events.MY_FILES_DELETE_FOLDER_SUCCESS,
                handler: function(event, data) {
                    var folder = data.folder;
                    myFilesSrvc
                        .getFolderById(folder.parent.id)
                        .then(function(parentFolder) {
                            broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, {
                                folder: parentFolder,
                                originalEvent: event,
                                originalData: data
                            });
                        });
                }
            }, {
                eventName: events.MY_FILES_COPY_FOLDER_SUCCESS,
                handler: function(event, data) {
                    broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, {
                        folder: data.toFolder,
                        originalEvent: event,
                        originalData: data
                    });
                }
            }, {
                eventName: events.MY_FILES_MOVE_FOLDER_SUCCESS,
                handler: function(event, data) {
                    broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, {
                        folder: data.fromFolder,
                        originalEvent: event,
                        originalData: data
                    });

                    broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, {
                        folder: data.toFolder,
                        originalEvent: event,
                        originalData: data
                    });
                }
            }, {
                eventName: events.MY_FILES_SEND_FOLDER_TO_DESKTOP_SUCCESS,
                handler: function(event, data) {
                    broadcast(events.MY_FILES_REFRESH_FILE_LIST, {
                        folder: data.toFolder,
                        originalEvent: event,
                        originalData: data
                    });
                }
            }, {
                eventName: events.MY_FILES_RENAME_FILE_SUCCESS,
                handler: function(event, data) {
                    var file = data.file;
                    myFilesSrvc
                        .getFolderById(file.folder.id)
                        .then(function(folder) {
                            var newData = {
                                folder: folder,
                                originalEvent: event,
                                originalData: data
                            };

                            broadcast(events.MY_FILES_REFRESH_FILE_LIST, newData);

                            if (file.type === fileTypes.FOLDER) {
                                broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, newData);
                            }
                        });
                }
            }, {
                eventName: events.MY_FILES_CREATE_EMPTY_FILE_SUCCESS,
                handler: function(event, data) {
                    broadcast(events.MY_FILES_REFRESH_FILE_LIST, {
                        folder: data.folder,
                        originalEvent: event,
                        originalData: data
                    });
                }
            }, {
                eventName: events.MY_FILES_DELETE_FILES_SUCCESS,
                handler: filesChangeHandler
            }, {
                eventName: events.MY_FILES_DELETE_FILES_FAILED,
                handler: filesChangeHandler
            }, {
                eventName: events.MY_FILES_SEND_FILES_TO_DESKTOP_SUCCESS,
                handler: function(event, data) {
                    var newData = {
                        folder: myFilesSrvc.getDesktopFolderInCache(),
                        originalEvent: event,
                        originalData: data
                    };

                    broadcast(events.MY_FILES_REFRESH_FILE_LIST, newData);
                }
            }, {
                eventName: events.MY_FILES_MOVE_FILES_SUCCESS,
                handler: function(event, data) {
                    var fromFolder = data.fromFolder;
                    var toFolder = data.toFolder;

                    var newDataFrom = {
                        folder: fromFolder,
                        originalEvent: event,
                        originalData: data
                    };
                    var newDataTo = {
                        folder: toFolder,
                        originalEvent: event,
                        originalData: data
                    }

                    broadcast(events.MY_FILES_REFRESH_FILE_LIST, newDataFrom);
                    broadcast(events.MY_FILES_REFRESH_FILE_LIST, newDataTo);

                    var hasFolder = _.any(data.files, {
                        type: fileTypes.FOLDER
                    });
                    if (hasFolder) {
                        broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, newDataFrom);
                        broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, newDataTo);
                    }
                }
            }, {
                eventName: events.MY_FILES_COPY_FILES_SUCCESS,
                handler: function(event, data) {
                    var toFolder = data.toFolder;
                    var newDataTo = {
                        folder: toFolder,
                        originalEvent: event,
                        originalData: data
                    };
                    broadcast(events.MY_FILES_REFRESH_FILE_LIST, newDataTo);

                    var hasFolder = _.any(data.files, {
                        type: fileTypes.FOLDER
                    });
                    if (hasFolder) {
                        broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, newDataTo);
                    }
                }
            }, {
                eventName: events.MY_FILES_LOAD_SUB_FOLDERS,
                handler: function(event, data) {
                    broadcast(events.MY_FILES_REFRESH_FILE_LIST, {
                        folder: data.folder,
                        originalEvent: event,
                        originalData: data
                    });
                }
            }, {
                eventName: events.MY_FILES_REFRESH_FILE_LIST,
                handler: function(event, data) {
                    var folder = data.folder;
                    var params = {
                        folder: folder,
                        originalEvent: event,
                        originalData: data
                    }
                    if (isDesktopFolder(folder)) {
                        broadcast(events.DESKTOP_REFRESH, params);
                    }
                    broadcast(events.FOLDER_BROWSER_REFRESH, params)
                }
            }];
        }

        function filesChangeHandler(event, data) {
            broadcast(events.MY_FILES_REFRESH_FILE_LIST, {
                folder: data.folder,
                originalEvent: event,
                originalData: data
            });

            var hasFolder = _.any(data.files, {
                type: fileTypes.FOLDER
            });
            if (hasFolder) {
                var file = _.first(data.files);
                myFilesSrvc
                    .getFolderById(file.folder.id)
                    .then(function(folder) {
                        broadcast(events.MY_FILES_LOAD_SUB_FOLDERS, {
                            folder: folder,
                            originalEvent: event,
                            originalData: data
                        });
                    });
            }
        }

        /// ------- utils -----------------------------

        function broadcast(eventName, data) {
            if (!hasCircle(eventName, data)) {
                $rootScope.$broadcast(eventName, data);
            }
        }

        function hasCircle(eventName, data) {
            var hasCircle = false;
            var originalData = data;
            while (!hasCircle && originalData.originalEvent) {
                hasCircle = originalData.originalEvent.name === eventName;
                originalData = originalData.originalData;
            }
            return hasCircle;
        }

        function isDesktopFolder(folder) {
            var desktopFolder = myFilesSrvc.getDesktopFolderInCache();
            return desktopFolder.id === folder.id;
        }
    }
})(NetBrain);