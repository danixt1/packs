import * as Getters from './getters';
export type PlaceToShowInUI = 'statusCard'|'statusBar'|'attribute';

interface BaseVariableDisplay{
    /**
     * case no title is passed and `showIn` is equal attribute only show what is inside the variable
     */
    title?: string;
    altText?:string;
    icon?:string;
    /**
     * Use the value in variable as the icon path.
     * Case the value results in a invalid path and `icon` is defined the property turns in a fallback.
     */
    isValueIconPath?:boolean;
    priority?: number;
    /**
     * How this variable is shown in the UI.
     * - `statusCard`: shown in the character status card.
     * - `statusBar`: shown in the status bar, can by used for important variables that the player needs to keep an eye on, like health, mana, etc.
     * - `attribute`: shown near character name as something he is or a effect ex: Arthur (with:poison)
     */
    showIn:PlaceToShowInUI

}
interface VariableDeclaratorBase{
    name:string;
    description?: string;
    /**
     * Set null to cancel the default display
     */
    display?:BaseVariableDisplay|null
}
interface VariableNumber extends VariableDeclaratorBase{
    type:'number';
    value: number;
    max?:number;
    min?:number;
}
interface VariableString extends VariableDeclaratorBase{
    type:'string';
    value: string;
}
interface VariableBoolean extends VariableDeclaratorBase{
    type:'boolean';
    value: boolean;
}

type VariableDeclarator = VariableNumber | VariableString | VariableBoolean;

interface Item{
    id: string;
    name: string;
    description: string;
    vars: VariableDeclarator[];
}

interface Place{
    id: string;
    name: string;
    description: string;
    connectedPlaces: string[];
    vars: VariableDeclarator[];
    charactersId: string[];
}

export interface Character{
    id: string;
    name: string;
    /**
     * Stable author-defined labels used for matching, filtering, and routing.
     * Use vars for mutable state; use labels for identity-like descriptors such
     * as npc, mage, rural, healer, merchant, etc.
     */
    labels?: string[];
    vars: VariableDeclarator[];
    controlledByPlayer: boolean;
    /**
     * Depending of the status of the character, the player can switch to control it or not, and the autonomy system can decide to execute actions with it or not.
     */
    playableStatus?: 'becomes-playable' | 'not-playable'|'playable-from-start';
    autonomy?: CharacterAutonomy | null;
}

interface GenericVariableToGet{
    type:'getter';
    in:string;
    variable: string;
    fallback?: string | number | boolean;
}
type VariableToGet = Getters.TargetCharacter | Getters.TargetPlace | Getters.TargetItem | Getters.World | Getters.Self | Getters.TempVariable | Getters.RuntimeAutonomy;

interface BaseModificator{
    /** Name used to expose the generated value as `temp-variable`. */
    tempVarName?: string;
}

interface ModificatorRandomInterval extends BaseModificator{
    type:'random-interval';
    min: number;
    max: number;
}
interface ModificatorRandomValue extends BaseModificator{
    type:'random-value';
    values: (string | number)[];
}


interface VariableModify<T extends VariableToGet = VariableToGet>{
    type:'setter';
    var :T;
    /** Arithmetic modes expect number-compatible current and incoming values. */
    mode: 'set' | 'increment' | 'decrement'| 'multiply' | 'divide';
    value: string | number | ModificatorRandomInterval | ModificatorRandomValue;
}
/**
 * Compares two literal values, getter results, or a mix of both.
 */
interface ConditionRelational<L = VariableToGet,R = VariableToGet>{
    type: 'condition-relational';
    operator: '>' | '<' | '==' | '!=';
    left: L | string | number | boolean;
    right: R | string | number| boolean;
    description?: string;
}
interface ConditionIsValid<T = VariableToGet>{
    type: 'condition-is-valid';
    /** Truthiness check after resolving the getter. */
    variableToCheck: T;
    description?: string;
}
interface ConditionExists<T = VariableToGet>{
    type: 'condition-exists';
    /** Checks that the getter can be resolved, regardless of the value truthiness. */
    variableToCheck: T;
    description?: string;
}
/**
 * Infix condition expression. Parentheses and NOT are interpreted by the
 * condition evaluator, so array order is semantically important.
 */
type ConditionalList<T = VariableToGet> = 'OR' | 'AND' | 'NOT' |'('|')'| ConditionRelational<T, T> | ConditionExists<T> | ConditionIsValid<T>;

interface Collector{
    type:'collector';
    /** Entity kind iterated by this collector before `collectIf` is applied. */
    target: 'character' | 'place' | 'item';
    /** Conditions are evaluated with each candidate available as `target:*`. */
    collectIf: ConditionalList[];
}

interface CollectorSelf{
    type:'collector';
    target: 'self';
}
interface CollectorConnectedPlaces{
    type:'collector';
    target: 'connectedPlaces';
    /** Source place id or getter; each connected place becomes `target:place`. */
    fromPlaceId: Getters.Self<Getters.PlaceMetadata> | string;
}
type CollectorToGet = Collector | CollectorSelf | CollectorConnectedPlaces;

interface MoveEffect{
    type: 'move';
    /** Character id to move. Usually `self-metadata:id`. */
    moveId: Getters.Self<Getters.CharacterMetadata>;
    /** Destination id. Character targets resolve to their current place. */
    toId:Getters.TargetCharacter | Getters.TargetPlace;
}
interface EventContext{
    /**
     * The entity that originated the event.
     * Used by filters like FROM_THE_PLAYER.
     */
    actorId?: string | VariableToGet;
    /**
     * The primary entity receiving the effect of the event.
     * Used by filters like TARGETS_PLAYER.
     */
    targetId?: string | VariableToGet;
    /**
     * The main subject of the event when it is not naturally actor/target oriented.
     * Useful for events like observation, discovery, status changes, etc.
     */
    subjectId?: string | VariableToGet;
    /**
     * Where the event happened.
     * Used by filters like IN_PLAYER_PLACE.
     */
    placeId?: string | VariableToGet;
    /**
     * Optional routing hint for the renderer/log system.
     */
    audience?: 'actor' | 'target' | 'place' | 'global';
    tags?: string[];
}
interface EventEffect{
    type: 'event';
    event: string;
    context?: EventContext;
    /** Optional coarse filter applied before the event is emitted. */
    emitOnlyIf?:'inTheSamePlaceAsPlayer' | 'actorIsPlayer' | 'targetIsPlayer' | 'actorIsNonPlayer' | 'targetIsNonPlayer';
    /** Payload fields available to text templates as `$roleName/fieldName$`. */
    data?: Record<string, string | number | boolean | VariableToGet>;
}
interface ConditionalEffect<E = EffectFomAction,C = ConditionalList> {
    type: 'conditional';
    /** Infix condition expression; see `ConditionalList`. */
    conditions: C[];
    onTrue: E[];
    onFalse?: E[];
}
interface StartDialogueEffect{
    type:'start-dialogue';
    /**
     * Starts a specific dialogue tree. Prefer intent for generic actions like
     * "talk", and use dialogueId when the action must force one exact tree.
     */
    dialogueId?: string;
    /**
     * Dialogue purpose used by the resolver to find the best matching tree.
     * Examples: small-talk, trade, quest-offer, ask-for-help.
     */
    intent?: string;
    targetId?: string | VariableToGet;
}

type EffectFomAction = MoveEffect | EventEffect | ConditionalEffect | VariableModify | StartDialogueEffect;
/** Effects allowed while another action is being interrupted. */
type EffectInterrupt = MoveEffect | EventEffect | ConditionalEffect<EffectInterrupt, ConditionalList<VariableToGet | Getters.RuntimeAction>>;

interface ActionDisplayInfo{
    name: string;
    description: string;
    /**
     * How the action is shown in the UI.
     * - ``optionOfObject``: the action is shown as an option when the player interacts with an object that meets the conditions to be a target of the action. Ex: "Attack" is shown as an option when the player interacts with a hostile character in the same place.
     * - ``optionOfActionList``: the action is shown as an option in a list of actions that the player can execute in the current moment. Ex: "Craft" is shown as an option in the list of actions when the player is in a place where they can craft something, and they have the necessary items, etc.
     */
    showAs:'optionOfObject'|'optionOfActionList';
    actionLockedText?:string;
    icon?:string;
}
/**
 * Controls how collected targets become executable action instances.
 * - `oneActionPerTarget`: one UI/runtime action per collected target,ex: if have 4 targets generates 4 actions.
 * - `oneActionForAllTargets`: one action containing all collected targets, in that case the effects list one per target.
 * - `oneActionPerTargetType`: one action grouped by target entity kind.
 */
type ActionBuildMode = 'oneActionPerTarget' | 'oneActionForAllTargets' | 'oneActionPerTargetType';
/**
 * Attributes change the behavior of the action.
 * 
 * - ``passiveAction``: the action is executed automatically when the activation conditions are met, without the need of the player/AI to choose to execute it. 
 * This can be used for example for actions that represent environmental effects, etc.
 * - ``showAsLockedInUI``: the action is shown in the UI but is locked, 
 * and the player can see the description of the action and what needs to be done to be able to execute it. This can be used for example for actions that represent interactions with objects that are not in the player's reach, etc.
 * - ``interruptible``: the action can be interrupted by other actions that have the "interruptor" attribute and meet the conditions to interrupt it.
 *  This can be used for example for actions that represent long interactions, like crafting, etc.
 */ 
type ActionAttributes = 'passiveAction'|'showAsLockedInUI'|'interruptible';
type ActionAudience = 'player' | 'autonomous';
interface ActionInterruptionDeclaration {
    /**
     * Phase 1: checked on the newly started action before it can interrupt an
     * existing action. `runtime:action` describes the existing running action.
     * If true, the newly started action cancels itself and no `onInterrupt`
     * effects run for it.
     */
    interruptSelfConditions?: ConditionalList<Getters.RuntimeAction>[];
    /**
     * Phase 2: checked on the existing running action after phase 1 is false.
     * `runtime:action` describes the newly started/interruption-causing action.
     * If true, the existing action runs `onInterrupt` and is cancelled.
     */
    interruptTargetConditions?: ConditionalList<Getters.RuntimeAction>[];
}
interface ActionDeclaration {
    name: string;
    /** If no display is passed the action automatically can't by used by the player */
    display?: ActionDisplayInfo | null;
    description?: string;
    /**
     * Controls how collected targets become executable action instances.
     * - `oneActionPerTarget`: one UI/runtime action per collected target.
     * - `oneActionForAllTargets`: one action containing all collected targets.
     * - `oneActionPerTargetType`: one action grouped by target entity kind.
     */
    buildMode?: ActionBuildMode;
    attributes?: ActionAttributes[];
    /** Conditions to be able to activate the action. 
     * 
     * Ex: the player needs to be in a specific place, or needs to have a specific item, or the target needs to have a variable with a specific value, etc.
     */
    activationConditions: ConditionalList[];
    /** Targets to collect after activation conditions pass. */
    targets: CollectorToGet[];
    /** Effects that run when execution starts. */
    onActivate: EffectFomAction[];
    /** Effects that run if this action is interrupted by another action. */
    onInterrupt?: EffectInterrupt[];
    /** Effects that run after `executionTime` completes. */
    onComplete: EffectFomAction[];
    /** Two-phase interruption rules for self-cancel and target interruption. */
    interruption?: ActionInterruptionDeclaration;
    categories?: string[];
    /**
     * Defines who is allowed to execute the action.
     * Defaults to `player` when omitted.
     */
    availableTo?: ActionAudience[];
    /**
     * The time to execute the action in minutes.
     */
    executionTime: number;
}

type AutonomyCondition = ConditionalList<VariableToGet | Getters.RuntimeAutonomy>;
type AutonomyRuleTargeting = 'firstValid' | 'randomValid' | 'allValid';

interface CharacterAutonomyGoal{
    name: string;
    description?: string;
    /**
     * Goals are evaluated from highest priority to lowest priority.
     */
    priority: number;
    when: AutonomyCondition[];
    stayActiveIf?: AutonomyCondition[];
}

interface CharacterAutonomyActionRule{
    type:'action-rule';
    name: string;
    description?: string;
    when: AutonomyCondition[];
    actionName: string;
    /**
     * Higher values win when multiple rules match the same cycle.
     */
    priority: number;
    /** Weighted tie-breaker among otherwise valid rules with similar priority. */
    weight?: number;
    /** Optional goal name that this rule belongs to. */
    goal?: string;
    /** Minimum time or cycles before this rule can be selected again. */
    cooldown?: number;
    /** How the autonomy system chooses among valid targets for the action. */
    targeting?: AutonomyRuleTargeting;
}

interface CharacterAutonomyIdleRule{
    type:'idle-rule';
    name: string;
    description?: string;
    when?: AutonomyCondition[];
    priority: number;
    goal?: string;
    /** Idle time in minutes. */
    duration?: number;
}

type CharacterAutonomyRule = CharacterAutonomyActionRule | CharacterAutonomyIdleRule;

interface CharacterAutonomy{
    /**
     * Rule-based autonomy keeps characters deterministic to author and easy to debug.
     */
    mode:'rule-based';
    enabled?: boolean;
    /**
     * Time in minutes between decision cycles.
     */
    decisionInterval?: number;
    /** Upper bound for actions selected during one decision cycle. */
    maxActionsPerCycle?: number;
    /** Actor-local variables used only by the autonomy system. */
    memory?: VariableDeclarator[];
    goals?: CharacterAutonomyGoal[];
    rules: CharacterAutonomyRule[];
}
interface DialogueMatch{
    /**
     * Exact character ids that this dialogue can target.
     */
    targetCharacterIds?: string[];
    /**
     * Label filters evaluated against the target character.
     */
    targetLabelsAny?: string[];
    targetLabelsAll?: string[];
    targetLabelsNone?: string[];
    /**
     * Label filters evaluated against the speaking/acting character.
     */
    selfLabelsAny?: string[];
    selfLabelsAll?: string[];
    selfLabelsNone?: string[];
    /**
     * Extra world/character state requirements for this dialogue to be usable.
     */
    conditions?: ConditionalList[];
}
type DialogueSpeaker =
    | 'self'
    | 'target'
    | 'narrator'
    | {
        type:'character';
        /** Explicit speaker id, or a getter that resolves to one. */
        id: string | VariableToGet;
    };
interface DialogueChoice{
    id: string;
    text: string;
    /**
     * Conditions decide if this choice is visible/available in the current
     * dialogue context.
     */
    conditions?: ConditionalList[];
    /**
     * Effects triggered when the player chooses this option.
     */
    effects?: EffectFomAction[];
    /** Next node to enter after applying effects. */
    nextNodeId?: string;
    /** Ends the conversation after applying effects. */
    endDialogue?: boolean;
}
interface DialogueNode{
    id: string;
    speaker: DialogueSpeaker;
    text: string;
    /** Effects triggered whenever this node becomes active. */
    onEnter?: EffectFomAction[];
    choices: DialogueChoice[];
}
interface DialogueTree{
    type:'dialogue-tree';
    id: string;
    name: string;
    /**
     * Purpose used by `effects` like start-dialogue to resolve a matching tree.
     */
    intent: string;
    /**
     * Higher priority wins when multiple dialogue trees match the same intent
     * and target context.
     */
    priority?: number;
    categories?: string[];
    match?: DialogueMatch;
    /** Id of the first node entered when this dialogue starts. */
    startsAt: string;
    nodes: DialogueNode[];
}
type EventConditions = 'FROM_THE_PLAYER'|'TARGETS_PLAYER'|'FROM_NON_PLAYER'|'TARGETS_NON_PLAYER'| 'IN_PLAYER_PLACE';
interface TextTemplateEventRoleMatch{
    /**
     * Event assigned to this role.
     */
    event: string;
    /**
     * Filters should evaluate only against event context/world state,
     * never against arbitrary payload field names.
     */
    filters?: EventConditions[];
    conditions?: ConditionalList<Getters.World | Getters.RuntimeEvent>[];
    /**
     * Optional relation constraints against another role.
     * Useful when one text needs multiple events from the same moment,
     * like "movement blocked" + "damage received".
     */
    sameActorAs?: string;
    sameTargetAs?: string;
    sameSubjectAs?: string;
    samePlaceAs?: string;
}
interface TextTemplateMatch{
    /**
     * Role used as the anchor event for choosing the template.
     */
    primaryRole: string;
    /**
     * Named event roles available inside the template.
     * Template placeholders should use $roleName/variable$.
     */
    roles: Record<string, TextTemplateEventRoleMatch>;
}
interface TextTemplate{
    type:'text-template';
    name: string;
    /** The text template, use: $roleName/variable$ in the text to get a variable value from the matched event role.
     * 
     * Example:
     * "Your movement to $interrupt/placeName$ was blocked and you took $damage/damage$ damage."
     */
    template: string;
    /**
     * Categories are used to group templates for the renderer/log system, so they can choose the best template to use based on the context of the event and the available templates.
     * Also the player can choose to see only the events of a specific category, etc.
     */
    categories?: string[];
    /**
     * Used to determine which template to use when multiple templates match the same event. 
     * Higher priority templates are chosen over lower priority ones. The default priority is 0.
     */
    priority?:number;
    match: TextTemplateMatch;
}
interface DisplayVariable extends BaseVariableDisplay{
    type:'char-var-display',
    varName:string
}
export type Display =DisplayVariable

export interface World{
    name:string;
    places: Place[];
    displays?:DisplayVariable[]
    characters: Character[];
    items: Item[];
    /**
     * Actions that the player can execute.
     * Self is always a character.
     * Autonomous characters can also reference these actions by `actionName`
     * when the action declares `availableTo: ['autonomous']` or includes both audiences.
     */
    characterActions: ActionDeclaration[];
    /**
     * Actions that should exist only for autonomous actors and never appear in the player UI.
     */
    autonomousActions?: ActionDeclaration[];
    vars: VariableDeclarator[];
    textTemplates: TextTemplate[];
    dialogues?: DialogueTree[];
}
