({
    getEmptySegmentTree: function() {
        /**
         * Generate a new segmentTree with basic required structure.  The AND
         * and NOT OR children of the root are the two sub-trees that are
         * exposed via the UI.  Here, we supply two "unspecified" SOURCE
         * segments for each terminal group.
         *
         * AND
         *  |
         *  +-OR
         *  |  |
         *  |  +-AND
         *  |
         *  +-NOT OR
         *     |
         *     +-AND
         */
        var segmentTree = {
            segmentType: 'AND_SEGMENT',
            isExclusion: false,
            children: [
                {
                    segmentType: 'OR_SEGMENT',
                    isExclusion: false,
                    children: [
                        {
                            segmentType: 'AND_SEGMENT',
                            isExclusion: false,
                            children: []
                        }
                    ]
                },
                {
                    segmentType: 'OR_SEGMENT',
                    isExclusion: true,
                    children: [
                        {
                            segmentType: 'AND_SEGMENT',
                            isExclusion: false,
                            children: []
                        }
                    ]
                }
            ]
        };

        this.setParentReferences(segmentTree, null);
        return segmentTree;
    },

    setParentReferences: function (segment, parent_) {
        segment.parent = parent_;
        if (segment.children) {
            for (var i = 0; i < segment.children.length; i += 1) {
                this.setParentReferences(segment.children[i], segment);
            }
        }
    },

    fillEmptyGroups: function (segment) {
        // Groups without child segments look weird in the UI.  This method
        // will find those empty groups and add a placeholder segment to them
        // to make it more clear for the user that a group exists there.
        if (segment.segmentType === 'AND_SEGMENT' || segment.segmentType === 'OR_SEGMENT') {
            if (segment.children.length === 0) {
                this.addSegment(segment);
            } else {
                for (var i = 0; i < segment.children.length; i += 1) {
                    this.fillEmptyGroups(segment.children[i]);
                }
            }
        }
    },

    getSubtreesForUI: function (segmentTree) {
         // Given a root segmentTree, pluck out the two children segments for
         // display in the UI.  One of these will the 'inclusion' segment, and
         // one will be the 'exclusion' segment.
        var inclusionSegment, exclusionSegment;

        var firstSubtree = segmentTree.children[0];
        var secondSubtree = segmentTree.children[1];

        if (firstSubtree.isExclusion) {
            exclusionSegment = firstSubtree;
            inclusionSegment = secondSubtree;
        } else {
            inclusionSegment = firstSubtree;
            exclusionSegment = secondSubtree;
        }
        return {
            segmentTree: segmentTree,
            inclusionSegment: inclusionSegment,
            exclusionSegment: exclusionSegment
        };
    },

    querySegmentTree: function (component, rootSegmentId, callback) {
        // Get the segmentTree corresponding to rootSegmentId by calling the
        // getSerializedSegmentTree Apex controller method
        this.apexControllerMethod(
            component,
            'c.getSerializedSegmentTree',
            {
                rootSegmentId: rootSegmentId
            },
            function (err, serializedSegmentTree) {
                if (err) {
                    return callback(err);
                }

                var segmentTree;

                try {
                    segmentTree = JSON.parse(serializedSegmentTree);
                } catch (e) {
                    return callback([e]);
                }

                return callback(null, segmentTree);
            }
        );
    },

    verifyPermissions: function (component) {
        var this_ = this;
        this.apexControllerMethod(
            component,
            'c.checkPerms',
            {},
            function (err) {
                if (err) {
                    var initErrorLabel;
                    if (component.get('v.nsPrefix') === 'camptools') {
                        initErrorLabel = '$Label.camptools.PageMessagesError';
                    } else {
                        initErrorLabel = '$Label.c.PageMessagesError';
                    }
                    component.set('v.disableSave', true);
                    this_.addPageMessage(
                        'error',
                        $A.get(initErrorLabel),
                        err[0].message
                    );
                }
            }
        );
    },

    validSegmentData: function (component, segmentData, severity) {
        var nsPrefix = component.get('v.nsPrefix');
        //Adding label comments to preload labels
        //$Label.camptools.PageMessagesWarning
        //$Label.c.PageMessagesWarning
        var label = '$Label.' + nsPrefix + '.PageMessages' + severity.charAt(0).toUpperCase() + severity.slice(1);
        var this_ = this;
        var valid = true;
        var incGroups = segmentData.inclusionSegment.children;
        var excGroups = segmentData.exclusionSegment.children;
        var hasInclude = false;
        var hasExclude = false;
        var addErrMessage = function(msg) {
            this_.addPageMessage(
                severity,
                $A.getReference(label),
                $A.get(msg)
            );
        }
        // A valid source is not empty, has a source id and a column name for reports
        var validSources = function(sources, checkEmpty) {
            var emptyGroup = true;
            var validSource = true;
            for (var srcIndex = 0; srcIndex < sources.length; srcIndex += 1) {
                /** Validation rules will change when Report Option is available
                if (!$A.util.isEmpty(sources[srcIndex].segmentType)) {
                    emptyGroup = false;
                    // When the source Id of a Campaign or Report is empty add the warning / error to the page
                    if ($A.util.isEmpty(sources[srcIndex].sourceId)) {
                        validSource = false;
                        addErrMessage(nsPrefix === 'camptools' ? '$Label.camptools.CampaignToolsListEditorSaveNoSource' : '$Label.c.CampaignToolsListEditorSaveNoSource');
                    // When the source is missing we will add the Id and Message to the Name - if the name contains the Id add the warning / error to the page
                    } else if (sources[srcIndex].sourceName.indexOf(sources[srcIndex].sourceId) > -1) {
                        validSource = false;
                        addErrMessage(nsPrefix === 'camptools' ? '$Label.camptools.CampaignToolsListEditorReadError' : '$Label.c.CampaignToolsListEditorReadError');
                    // When the source is a Report and the column name to use from the report is empty add the warning / error to the page
                    } else if (sources[srcIndex].segmentType === 'REPORT_SOURCE_SEGMENT' &&
                        $A.util.isEmpty(sources[srcIndex].columnName)) {
                        validSource = false;
                        addErrMessage(nsPrefix === 'camptools' ? '$Label.camptools.CampaignToolsListEditorSaveNoColumn' : '$Label.c.CampaignToolsListEditorSaveNoColumn');
                    }
                } */
                if (!$A.util.isEmpty(sources[srcIndex].sourceId)) {
                    emptyGroup = false;
                    if (sources[srcIndex].sourceName.indexOf(sources[srcIndex].sourceId) > -1) {
                        validSource = false;
                        addErrMessage(nsPrefix === 'camptools' ? '$Label.camptools.CampaignToolsListEditorReadError' : '$Label.c.CampaignToolsListEditorReadError');
                    // When the source is a Report and the column name to use from the report is empty add the warning / error to the page
                    } else if (sources[srcIndex].segmentType === 'REPORT_SOURCE_SEGMENT' /** && Error for all reports until Report Option is available
                        $A.util.isEmpty(sources[srcIndex].columnName)*/) {
                        validSource = false;
                        // addErrMessage(nsPrefix === 'camptools' ? '$Label.camptools.CampaignToolsListEditorSaveNoColumn' : '$Label.c.CampaignToolsListEditorSaveNoColumn');
                        addErrMessage(nsPrefix === 'camptools' ? '$Label.camptools.CampaignToolsListEditorReportError' : '$Label.c.CampaignToolsListEditorReportError');
                    }
                }
            }
            if (checkEmpty && emptyGroup) {
                validSource = false;
                addErrMessage(nsPrefix === 'camptools' ? '$Label.camptools.CampaignToolsListEditorSaveEmptyGroup' : '$Label.c.CampaignToolsListEditorSaveEmptyGroup');
            }
            valid = valid && validSource; // a segment group can be valid when the first and only group is empty

            return validSource && !emptyGroup; // a source is not valid when an empty group is present unlike a segment group which may have an empty group
        }
        // Iterate through each inclusion group to determine if the groups sources are valid
        for (var incIndex = 0; incIndex < incGroups.length; incIndex += 1) {
            var validIncSources = validSources(incGroups[incIndex].children, incGroups.length > 1);
            hasInclude = hasInclude || validIncSources;
        }
        // Iterate through each exclusion group to determine if the groups sources are valid
        for (var excIndex = 0; excIndex < excGroups.length; excIndex += 1) {
            var validExcSources = validSources(excGroups[excIndex].children, excGroups.length > 1);
            hasExclude = hasExclude || validExcSources;
        }
        // When an exclusion is present there must always be at least one inclusion, final validation once all sources are complete
        if (hasExclude && !hasInclude && valid) {
            valid = false;
            addErrMessage(nsPrefix === 'camptools' ? '$Label.camptools.CampaignToolsListEditorSaveNoIncludes' : '$Label.c.CampaignToolsListEditorSaveNoIncludes');
        }

        return valid;
    },

    loadSegmentTreeData: function (component, rootSegmentId, callback) {
        // If a rootSegmentId is provided, then query for the segmentTree
        // corresponding to that rootSegmentId.  Otherwise, generate an empty
        // segmentTree.
        // Once a segmentTree is loaded, pluck out the two relevant subtrees
        // for the UI.
        var this_ = this;
        var next = function (err, segmentTree) {
            if (err) {
                return callback(err);
            }
            this_.fillEmptyGroups(segmentTree);
            this_.setParentReferences(segmentTree, null);
            return callback(null, this_.getSubtreesForUI(segmentTree));
        };

        if (rootSegmentId) {
            this.querySegmentTree(component, rootSegmentId, next);
        } else {
            next(null, this.getEmptySegmentTree());
        }
    },

    saveSegmentData: function (component, campaignId, segmentData, callback) {
        var serializableProperties = [
            'segmentId', 'segmentType', 'rootSegmentId', 'parentId', 'sourceId',
            'isExclusion', 'columnName', 'sourceName', 'children', 'statusIds'
        ];
        var serializedSegmentTree = JSON.stringify(
            segmentData.segmentTree,
            serializableProperties
        );
        this.apexControllerMethod(
            component,
            'c.saveCSegmentTree',
            {
                campaignId: campaignId,
                csegRoot: serializedSegmentTree
            },
            function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null);
            }
        );
    },

    addSegment: function (group) {
        var segmentType = 'CAMPAIGN_SOURCE_SEGMENT'; // Defaulting to Campaign until Report Option is available.
        var children = [];
        children = group.children;
        children.push({
            segmentType: segmentType,
            isExclusion: false,
            parent: group
        });
        group.children = children;
    },

    addGroup: function (group) {
        var segmentType = 'CAMPAIGN_SOURCE_SEGMENT'; // Defaulting to Campaign until Report Option is available.
        var children = [];
        children = group.children;
        var newGroup = {
            segmentType: 'AND_SEGMENT',
            isExclusion: false,
            parent: group,
            children: [
                {
                    segmentType: segmentType,
                    isExclusion: false
                }
            ]
        };

        newGroup.children[0].parent = newGroup;

        children.push(newGroup);
        group.children = children;
    },

    deleteSegment: function (segment) {
        if (segment.parent) {
            var siblings = [];
            siblings = segment.parent.children;
            siblings.splice(siblings.indexOf(segment), 1);
            segment.parent.children = siblings;
            if (siblings.length === 0) {
                // If the parent is the last group do not delete instead add empty segment
                if (!$A.util.isEmpty(segment.parent.parent) && segment.parent.parent.children.length > 1) {
                    this.deleteSegment(segment.parent);
                } else {
                    this.addSegment(segment.parent);
                }
            }
        }
    },

    addPageMessage: function (severity, summary, detail) {
        var addPageMessageEvent = $A.get('e.c:AddPageMessageEvent');
        addPageMessageEvent.setParams(
            {
                severity: severity,
                summary: summary,
                detail: detail
            }
        );
        addPageMessageEvent.fire();
    },

    apexControllerMethod: function (component, name, params, callback) {
        var action = component.get(name);
        action.setParams(params);
        action.setCallback(
            this,
            function (response) {
                if (!component.isValid()) {
                    var methodExceptionLabel;
                    if (component.get('v.nsPrefix') === 'camptools') {
                        methodExceptionLabel = '$Label.camptools.CampaignToolsEditorMethodException';
                    } else {
                        methodExceptionLabel = '$Label.c.CampaignToolsEditorMethodException';
                    }
                    return callback([new Error(
                        $A.get(methodExceptionLabel)
                    )]);
                }

                var state = response.getState();

                if (state === 'ERROR') {
                    return callback(response.getError());
                }

                return callback(null, response.getReturnValue());
            }
        );
        $A.enqueueAction(action);
    }
})