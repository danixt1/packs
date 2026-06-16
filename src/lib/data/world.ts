import type { World } from "$lib/types/data/declarative";

export const world: World = {
    name:'Adventure World',
    displays:[
        {
            type:"char-var-display",
            varName:"health",
            showIn:'statusBar',
            title:"Health",
            priority:10
        },
        {
            type:"char-var-display",
            varName:"energy",
            showIn:"statusBar",
            title:"Energy",
            priority:10
        }
    ],
    places:[
        {
            id:'camp',
            name:'Camp',
            description:'A Small camp with a fire in the middle',
            connectedPlaces: ['path-to-florest'],
            vars:[
                {name:'onObservedText', type:'string', value:'A small camp where a fire is burning. You can see some logs around the fire to sit on.'}
            ],
            charactersId:['arthur','merlin']
        },
        {
            id:'path-to-florest',
            name:'Path to the Forest',
            description:'A narrow path leading to the dense forest.',
            connectedPlaces: ['camp','florest'],
            vars:[],
            charactersId:[]
        },
        {
            id:'florest',
            name:'Florest',
            description:'A dense and dark forest, filled with the sounds of unknown creatures.',
            connectedPlaces: ['path-to-florest'],
            vars:[],
            charactersId:['troll']
        }
    ],
    characters:[
        {
            id:'arthur',
            name:'Arthur',
            labels:['player','human'],
            vars:[
                {name:'health', type:'number', value:100},
                {name:'energy', type:'number', value:10,min:0, max:10},
                {name:'canAttack', type:'boolean', value:true}
            ],
            controlledByPlayer:true,
            autonomy:null
        },
        {
            id:'troll',
            name:'Troll',
            labels:['npc','hostile','forest','autonomous'],
            vars:[
                {name:'health', type:'number', value:80,min:0, max:80},
                {name:'energy', type:'number', value:5,min:0, max:10},
                {name:'isHostile', type:'boolean', value:true},
                {name:'canAttack', type:'boolean', value:true}
            ],
            controlledByPlayer:false,
            playableStatus:'not-playable',
            autonomy:{
                mode:'rule-based',
                enabled:true,
                decisionInterval:2,
                maxActionsPerCycle:1,
                goals:[
                    {
                        name:'survive',
                        description:'When badly hurt, prefer leaving combat.',
                        priority:100,
                        when:[
                            {
                                type:'condition-relational',
                                left:{type:'getter', in:'self-variable', variable:'health'},
                                operator:'<',
                                right:25
                            }
                        ]
                    },
                    {
                        name:'hunt',
                        description:'Attack nearby enemies when still capable of fighting.',
                        priority:50,
                        when:[
                            {
                                type:'condition-relational',
                                left:{type:'getter', in:'self-variable', variable:'health'},
                                operator:'>',
                                right:0
                            }
                        ]
                    }
                ],
                rules:[
                    {
                        type:'action-rule',
                        name:'retreat from danger',
                        goal:'survive',
                        priority:100,
                        actionName:'Move',
                        targeting:'randomValid',
                        when:[
                            {
                                type:'condition-relational',
                                left:{type:'getter', in:'runtime:autonomy-metadata', variable:'currentGoal'},
                                operator:'==',
                                right:'survive'
                            }
                        ]
                    },
                    {
                        type:'action-rule',
                        name:'attack nearby threat',
                        goal:'hunt',
                        priority:80,
                        actionName:'attack',
                        targeting:'firstValid',
                        when:[
                            {
                                type:'condition-relational',
                                left:{type:'getter', in:'runtime:autonomy-metadata', variable:'currentGoal'},
                                operator:'==',
                                right:'hunt'
                            }
                        ]
                    },
                    {
                        type:'idle-rule',
                        name:'wait for an opening',
                        priority:1,
                        duration:2
                    }
                ]
            }
        },
        {
            id:'merlin',
            name:'Merlin',
            labels:['npc','mage','rural','healer','friendly'],
            vars:[
                {name:'health', type:'number', value:50,max:50},
                {name:'energy', type:'number', value:10,min:0, max:10},
                {name:'canAttack', type:'boolean', value:false},
                {name:'isHostile', type:'boolean', value:false},
                {name:'mood', type:'number', value:5,min:0, max:10}
            ],
            controlledByPlayer:false,
            playableStatus:'playable-from-start'
        }
    ],
    items:[],
    characterActions:[
        {
            name:'Move',
            categories:['movement'],
            availableTo:['player','autonomous'],
            display:{
                name:'Move to $target:place-metadata:name$',
                description:'Move to the connected place',
                showAs:'optionOfObject'
            },
            buildMode:'oneActionPerTarget',
            activationConditions:[
                {
                    type:'condition-relational',
                    left:{type:'getter',in:'self-variable',variable:'health'},
                    operator:'>',
                    right:-1
                }
            ],
            executionTime:10,
            targets:[{type:'collector', target:'connectedPlaces', fromPlaceId:{type:'getter', in:'self-variable', variable:'placeId'}}],
            onActivate:[],
            onInterrupt:[
                {
                    type:'event',
                    event:'MOVE_INTERRUPTED',
                    context:{
                        targetId:{type:'getter', in:'self-metadata', variable:'id'},
                        placeId:{type:'getter', in:'target:place-metadata', variable:'id'},
                        audience:'target'
                    },
                    data:{
                        characterName:{type:'getter', in:'self-variable', variable:'name'},
                        placeName:{type:'getter', in:'target:place-metadata', variable:'name'}
                    }
                },
                {
                    type:'conditional',
                    conditions:[
                        {
                            type:'condition-relational',
                            left:{type:'getter', in:'runtime:action-metadata', variable:'actionName'},
                            operator:'==',
                            right:'attack'
                        }
                    ],
                    onTrue:[
                        {
                            type:'event',
                            event:'MOVE_INTERRUPTED_BY_ATTACK',
                            context:{
                                targetId:{type:'getter', in:'self-metadata', variable:'id'},
                                placeId:{type:'getter', in:'target:place-metadata', variable:'id'},
                                audience:'target',
                                tags:['attack']
                            },
                            data:{
                                characterName:{type:'getter', in:'self-variable', variable:'name'},
                                placeName:{type:'getter', in:'target:place-metadata', variable:'name'}
                            }
                        }
                    ]
                }
            ],
            onComplete:[
                {
                    type:'move', 
                    moveId:{type:'getter', in:'self-variable', variable:'id'}, 
                    toId:{type:'getter', in:'target:place-metadata', variable:'id'}
                },
                {
                    type:'event',
                    event:'CHARACTER_MOVED',
                    context:{
                        actorId:{type:'getter', in:'self-metadata', variable:'id'},
                        subjectId:{type:'getter', in:'self-metadata', variable:'id'},
                        placeId:{type:'getter', in:'target:place-metadata', variable:'id'},
                        audience:'place'
                    },
                    data:{
                        characterName:{type:'getter', in:'self-variable', variable:'name'},
                        placeName:{type:'getter', in:'target:place-metadata', variable:'name'}
                    }
                }
            ]
        },
        {
            name:'observe',
            display:{
                name:'Observe the place',
                showAs:'optionOfActionList',
                description:'Observe the place you are in to get more information about it.'
            },
            buildMode:'oneActionForAllTargets',
            activationConditions:[],
            executionTime:2,
            targets:[
                {type:'collector', target:'place',collectIf:[
                    {type:'condition-relational', left:{type:'getter', in:'self-variable', variable:'placeId'}, operator:'==', right:{type:'getter', in:'target:place-metadata', variable:'id'}},
                    'AND',
                    {type:'condition-exists', variableToCheck:{type:'getter', in:'target:place-variable', variable:'onObservedText'}}
                ]}
            ],
            onActivate:[],
            onComplete:[
                {
                    type:'event',
                    event:'PLACE_OBSERVED',
                    context:{
                        actorId:{type:'getter', in:'self-metadata', variable:'id'},
                        subjectId:{type:'getter', in:'target:place-metadata', variable:'id'},
                        placeId:{type:'getter', in:'target:place-metadata', variable:'id'},
                        audience:'actor'
                    },
                    data:{
                        text:{type:'getter', in:'target:place-variable', variable:'onObservedText'}
                    }
                }
            ]
        },
        {
            name:'attack',
            attributes:['showAsLockedInUI','interruptible'],
            availableTo:['player','autonomous'],
            display:{
                name:'Attack $target:character-metadata:name$',
                showAs:'optionOfObject',
                description:'Attack a hostile character in the same place.'
            },
            buildMode:'oneActionPerTarget',
            activationConditions:[
                {
                    type:'condition-relational',
                    left:{type:'getter', in:'self-variable', variable:'health'},
                    operator:'>',
                    right:0
                },
                'AND',
                {
                    type:'condition-relational',
                    left:{type:'getter', in:'self-variable', variable:'energy'},
                    operator:'>',
                    right:0
                },
                'AND',
                {
                    type:'condition-relational',
                    left:{type:'getter', in:'self-variable', variable:'canAttack'},
                    operator:'==',
                    right:true
                }
            ],
            executionTime:3,
            targets:[
                {
                    type:'collector',
                    target:'character',
                    collectIf:[
                        {
                            type:'condition-relational',
                            left:{type:'getter', in:'self-metadata', variable:'id'},
                            operator:'!=',
                            right:{type:'getter', in:'target:character-metadata', variable:'id'},
                            description:'Target character must be different from the self character'
                        },
                        'AND',
                        {
                            type:'condition-relational',
                            left:{type:'getter', in:'self-metadata',variable:'idPlace'},
                            operator:'==',
                            right:{type:'getter', in:'target:character-metadata', variable:'idPlace'},
                            description:'Target character must be in the same place as the self character'
                        },
                        'AND',
                        {
                            type:'condition-relational',
                            left:{type:'getter', in:'target:character-variable', variable:'health'},
                            operator:'>',
                            right:0,
                            description:'Target character must have health greater than 0'
                        },
                        'AND',
                        {
                            type:'condition-is-valid',
                            variableToCheck:{type:'getter', in:'target:character-variable', variable:'canAttack'},
                            description:'Target character must be able to attack (valid canAttack variable)'
                        }
                    ]
                }
            ],
            interruption: {
                interruptSelfConditions:[],
                interruptTargetConditions:[{
                    type:'condition-relational',
                    left:{type:'getter', in:'runtime:action-metadata', variable:'actionName'},
                    operator:'!=',
                    right:'attack'
                }]
            },
            onActivate:[],
            onInterrupt:[],
            onComplete:[
                {
                    type:'setter',
                    var:{type:'getter', in:'target:character-variable', variable:'health'},
                    mode:'decrement',
                    value:{type:'random-interval', min:5, max:15, tempVarName:'damageDealt'}
                },
                {
                    type:'setter',
                    var:{type:'getter', in:'self-variable', variable:'energy'},
                    mode:'decrement',
                    value:1
                },
                {
                    type:'event',
                    event:'CHARACTER_ATTACKED',
                    context:{
                        actorId:{type:'getter', in:'self-metadata', variable:'id'},
                        targetId:{type:'getter', in:'target:character-metadata', variable:'id'},
                        placeId:{type:'getter', in:'self-metadata', variable:'idPlace'},
                        audience:'place',
                        tags:['combat']
                    },
                    data:{
                        attackerName:{type:'getter', in:'self-metadata', variable:'name'},
                        targetName:{type:'getter', in:'target:character-metadata', variable:'name'},
                        damage:{type:'getter', in:'temp-variable', variable:'damageDealt'},
                        remainingHealth:{type:'getter', in:'target:character-variable', variable:'health'}
                    }
                }
            ]
        },
        {
            name:'talk',
            categories:['social'],
            availableTo:['player'],
            display:{
                name:'Talk to $target:character-metadata:name$',
                showAs:'optionOfObject',
                description:'Start a conversation.'
            },
            buildMode:'oneActionPerTarget',
            activationConditions:[],
            executionTime:0,
            targets:[
                {
                    type:'collector',
                    target:'character',
                    collectIf:[
                        {
                            type:'condition-relational',
                            left:{type:'getter', in:'self-metadata', variable:'id'},
                            operator:'!=',
                            right:{type:'getter', in:'target:character-metadata', variable:'id'}
                        },
                        'AND',
                        {
                            type:'condition-relational',
                            left:{type:'getter', in:'self-metadata', variable:'idPlace'},
                            operator:'==',
                            right:{type:'getter', in:'target:character-metadata', variable:'idPlace'}
                        },
                        'AND',
                        {
                            type:'condition-relational',
                            left:{type:'getter', in:'target:character-variable', variable:'health'},
                            operator:'>',
                            right:0
                        },
                        'AND',
                        {
                            type:'condition-relational',
                            left:{type:'getter', in:'target:character-variable', variable:'isHostile'},
                            operator:'==',
                            right:false
                        }
                    ]
                }
            ],
            onActivate:[
                {
                    type:'start-dialogue',
                    intent:'small-talk',
                    targetId:{type:'getter', in:'target:character-metadata', variable:'id'}
                }
            ],
            onComplete:[]
        },
        {
            name:'wait',
            description:'Wait for a few minutes.',
            display:{
                name:'Wait',
                description:'Wait for a few minutes to recover some energy.',
                showAs:'optionOfActionList',
            },
            activationConditions:[
                {type:'condition-relational', left:{type:'getter', in:'self-variable', variable:'health'}, operator:'>', right:0}
            ],
            executionTime:5,
            targets:[{type:'collector', target:'self'}],
            onActivate:[],
            onComplete:[
                {type:'setter', var:{type:'getter', in:'self-variable', variable:'energy'}, mode:'increment', value:2},
                {type:'event',
                    event:'WAIT_COMPLETED',
                    context:{
                        actorId:{type:'getter', in:'self-metadata', variable:'id'},
                        subjectId:{type:'getter', in:'self-metadata', variable:'id'},
                        placeId:{type:'getter', in:'self-metadata', variable:'idPlace'},
                    }
                }
            ]
        }
    ],
    autonomousActions:[
        {
            name:'wait',
            description:'Skip the current autonomy cycle without changing the world state.',
            availableTo:['autonomous'],
            activationConditions:[],
            executionTime:2,
            targets:[{type:'collector', target:'self'}],
            onActivate:[],
            onComplete:[]
        }
    ],
    dialogues:[
        {
            type:'dialogue-tree',
            id:'rural-npc-small-talk',
            name:'Rural NPC Small Talk',
            intent:'small-talk',
            priority:10,
            categories:['small-talk'],
            match:{
                targetLabelsAll:['npc','rural'],
                targetLabelsNone:['hostile']
            },
            startsAt:'start',
            nodes:[
                {
                    id:'start',
                    speaker:'target',
                    text:"What's up?",
                    choices:[
                        {
                            id:'ask-for-help',
                            text:'Can you help me?',
                            conditions:[
                                {
                                    type:'condition-relational',
                                    left:{type:'getter', in:'self-variable', variable:'health'},
                                    operator:'<',
                                    right:100
                                }
                            ],
                            effects:[
                                {
                                    type:'setter',
                                    var:{type:'getter', in:'self-variable', variable:'health'},
                                    mode:'increment',
                                    value:20
                                },
                                {
                                    type:'setter',
                                    var:{type:'getter', in:'target:character-variable', variable:'mood'},
                                    mode:'increment',
                                    value:1
                                }
                            ],
                            nextNodeId:'helped'
                        },
                        {
                            id:'say-bye',
                            text:'Nothing. See you.',
                            endDialogue:true
                        }
                    ]
                },
                {
                    id:'helped',
                    speaker:'target',
                    text:'There. That should help for now.',
                    choices:[
                        {
                            id:'thanks',
                            text:'Thanks.',
                            endDialogue:true
                        }
                    ]
                }
            ]
        }
    ],
    textTemplates:[
        {
            type:'text-template',
            name:'Game Start',
            template:'Welcome to the Adventure World! You find yourself in a small camp with a fire burning in the middle. You can see some logs around the fire to sit on.',
            match:{
                primaryRole:'start',
                roles:{
                    start:{
                        event:'GAME_START'
                    }
                }
            },
            priority:10,
            categories:['first-person']

        },
        {
            type:'text-template',
            name:'Player Is attacked',
            template:'$attack/attackerName$ attacked you and dealt $attack/damage$ damage.',
            match:{
                primaryRole:'attack',
                roles:{
                    attack:{
                        event:'CHARACTER_ATTACKED',
                        filters:['TARGETS_PLAYER']
                    }
                }
            },
            priority:10,
            categories:['first-person']
        },
        {
            type:'text-template',
            name:'Player Attacks',
            template:'You attacked $attack/targetName$ and dealt $attack/damage$ damage.',
            match:{
                primaryRole:'attack',
                roles:{
                    attack:{
                        event:'CHARACTER_ATTACKED',
                        filters:['FROM_THE_PLAYER']
                    }
                }
            },
            priority:10,
            categories:['first-person']
        },
        {
            type:'text-template',
            name:'General Attack',
            template:'$attack/attackerName$ attacked $attack/targetName$ and dealt $attack/damage$ damage.',
            match:{
                primaryRole:'attack',
                roles:{
                    attack:{
                        event:'CHARACTER_ATTACKED',
                        filters:['IN_PLAYER_PLACE']
                    }
                }
            },
            priority:5,
            categories:['third-person']
        },
        {
            type:'text-template',
            name:'Attacking while attacked',
            template:'you attacked $player/targetName$, and give $player/damage$ but got attacked by $origin/attackerName$ at the same time, receiving $origin/damage$ damage.',
            match:{
                primaryRole:'origin',
                roles:{
                    origin:{
                        event:'CHARACTER_ATTACKED',
                        filters:['TARGETS_PLAYER'],
                    },
                    player:{
                        event:'CHARACTER_ATTACKED',
                        filters:['FROM_THE_PLAYER'],
                        samePlaceAs:'origin'
                    }
                }
            },
            priority:20,
            categories:['first-person','combat']
        },
        {
            type:'text-template',
            name:'moviment interrupted',
            template:'Your movement was interrupted while moving to $interrupt/placeName$.',
            match:{
                primaryRole:'interrupt',
                roles:{
                    interrupt:{
                        event:'MOVE_INTERRUPTED',
                        filters:['TARGETS_PLAYER']
                    }
                }
            },
            priority:5,
            categories:['first-person']
        },
        {
            type:'text-template',
            name:'moviment interrupted by attack',
            template:'While you are moving to $interrupt/placeName$. you gotta attacked by $interrupt/characterName$ blocking you.',
            match:{
                primaryRole:'interrupt',
                roles:{
                    interrupt:{
                        event:'MOVE_INTERRUPTED_BY_ATTACK',
                        filters:['TARGETS_PLAYER']
                    }
                }
            },
            priority:5,
            categories:['first-person']
        },
        {
            type:'text-template',
            name:'movement blocked and player damaged',
            template:'While you were moving to $interrupt/placeName$, $damage/attackerName$ blocked your path and dealt $damage/damage$ damage.',
            match:{
                primaryRole:'interrupt',
                roles:{
                    interrupt:{
                        event:'MOVE_INTERRUPTED_BY_ATTACK',
                        filters:['TARGETS_PLAYER']
                    },
                    damage:{
                        event:'CHARACTER_ATTACKED',
                        filters:['TARGETS_PLAYER'],
                        sameTargetAs:'interrupt',
                        samePlaceAs:'interrupt'
                    }
                }
            },
            priority:20,
            categories:['first-person','combat','movement']
        },
        {
            type:'text-template',
            name:'Place Observed',
            template:'You observe the place and get the following information: $observation/text$',
            match:{
                primaryRole:'observation',
                roles:{
                    observation:{
                        event:'PLACE_OBSERVED',
                        filters:['FROM_THE_PLAYER']
                    }
                }
            },
            priority:5,
            categories:['first-person']
        },
        {
            type:'text-template',
            name:'Player Moved',
            template:'You moved to $move/placeName$.',
            match:{
                primaryRole:'move',
                roles:{
                    move:{
                        event:'CHARACTER_MOVED',
                        filters:['FROM_THE_PLAYER']
                    }
                }
            }
        },
        {
            type:'text-template',
            name:'waited',
            template:'You waited for a while and recovered some energy.',
            match:{
                primaryRole:'wait',
                roles:{
                    wait:{
                        event:'WAIT_COMPLETED',
                        filters:['FROM_THE_PLAYER']
                    }
                }
            }
        },
        {
            type:'text-template',
            name:'Enemy killed',
            template:'$death/targetName$ was killed.',
            match:{
                primaryRole:'death',
                roles:{
                    death:{
                        event:'CHARACTER_ATTACKED',
                        filters:['IN_PLAYER_PLACE'],
                        conditions:[{
                            type:'condition-relational',
                            left:{type:'getter', in:'runtime:event-variable', variable:'remainingHealth'},
                            operator:'==',
                            right:0
                        }]
                    }
                }
            },
            priority:50,
            categories:['third-person','combat']
        }
    ],
    vars:[]
}
