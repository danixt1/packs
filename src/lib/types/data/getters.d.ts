/**
 * Getter `in` values describe both scope and source:
 * - `*-variable` reads mutable author data from `vars`.
 * - `*-metadata` reads engine-owned fields such as ids, names, and place ids.
 */
export type CharacterMetadata = 'idPlace'|'isPlayer'|'isObserved'|'name'|'id';
export type PlaceMetadata = 'name'|'description'|'id';
export type ActionRuntimeMetadata = `hasCategory:${string}`|'actionName'|'executionTime'|'isFromPlayer';
export type AutonomyRuntimeMetadata = 'currentGoal'|'lastActionName'|'cycle';

interface BaseGetter{
    type:'getter';
    /** Value used when the resolved variable/metadata is missing. */
    fallback?: string | number | boolean;
}

type VariableGetter<V extends string> = {
    in: `${V}-variable`;
    variable: string;
} & BaseGetter;
type VariableMetadataGetter<V extends string,M> = {
    in: `${V}-metadata`;
    variable: M;
} & BaseGetter;

type PrefixTargetCharacter = 'target:character';
type PrefixTargetCharacterPlace = 'target:character/place';
type GetCharacterMetada = VariableMetadataGetter<PrefixTargetCharacter, CharacterMetadata>;
type GetCharacterVariable = VariableGetter<PrefixTargetCharacter>;
type GetCharacterPlaceVariable = VariableGetter<PrefixTargetCharacterPlace>;
type GetCharacterPlaceMetadata = VariableMetadataGetter<PrefixTargetCharacterPlace, PlaceMetadata>;


export type TargetCharacter = GetCharacterMetada | GetCharacterVariable | GetCharacterPlaceVariable | GetCharacterPlaceMetadata;

type PrefixTargetPlace = 'target:place';
type GetPlaceMetadata = VariableMetadataGetter<PrefixTargetPlace, PlaceMetadata>;
type GetPlaceVariable = VariableGetter<PrefixTargetPlace>;
export type TargetPlace = GetPlaceMetadata | GetPlaceVariable;

type PrefixTargetItem = 'target:item';
type GetItemMetadata = VariableMetadataGetter<PrefixTargetItem, 'name'|'description'|'id'>;
type GetItemVariable = VariableGetter<PrefixTargetItem>;
export type TargetItem = GetItemMetadata | GetItemVariable;

type PrefixEventRuntime = 'runtime:event';
type GetEventRuntimeMetadata = VariableMetadataGetter<PrefixEventRuntime, 'event'|'actorId'|'targetId'|'placeId'>;
type GetEventRuntimeVariable = VariableGetter<PrefixEventRuntime>;
export type RuntimeEvent = GetEventRuntimeMetadata | GetEventRuntimeVariable;

type PrefixActionRuntime = 'runtime:action';
type GetActionRuntimeMetadata = VariableMetadataGetter<PrefixActionRuntime, ActionRuntimeMetadata>;
export type RuntimeAction = GetActionRuntimeMetadata;
/**
 * Temporary values live only for the current action execution.
 * 
 * Ex:
 * Store the result of a random modificator to reuse it later in the
 * action, like keeping rolled damage for both state changes and event text.
 */
type PrefixTemp = 'temp';
export type TempVariable = VariableGetter<PrefixTemp>;
type GetWorldVariable = VariableGetter<'world'>;
export type World = GetWorldVariable;
export type Self<T = CharacterMetadata> = VariableGetter<'self'> | VariableMetadataGetter<'self', T>;

type PrefixRuntimeAutonomy = 'runtime:autonomy';
type GetAutonomyRuntimeMetadata = VariableMetadataGetter<PrefixRuntimeAutonomy, AutonomyRuntimeMetadata>;
type GetAutonomyRuntimeVariable = VariableGetter<PrefixRuntimeAutonomy>;
export type RuntimeAutonomy = GetAutonomyRuntimeMetadata | GetAutonomyRuntimeVariable;