export type ItemLocation =
	| { type: 'place'; id: string }
	| { type: 'character'; id: string }
	| { type: 'nowhere' };

export type RuntimeVariable = {
	name: string;
	type: 'number' | 'string' | 'boolean';
	value: string | number | boolean;
	min?: number;
	max?: number;
	description?: string;
};
export interface BaseDisplay{
	icon:string | null;
	iconFallback:string | null
	/** Value to show in frontend */
	value:string | number | boolean|null
}
export interface VarDisplayView extends BaseDisplay{
	title:string | null
	altText:string | null
	priority:number
	min?:number
	max?:number
};

export interface DisplayAttribute extends  BaseDisplay{
	title:string | null
	altText:string | null
}

export type RuntimePlace = {
	id: string;
	name: string;
	description: string;
	connectedPlaces: string[];
	vars: RuntimeVariable[];
	charactersId: string[];
};

export type RuntimeCharacter = {
	id: string;
	name: string;
	labels: string[];
	vars: RuntimeVariable[];
	controlledByPlayer: boolean;
	playableStatus?: string;
	placeId: string;
	autonomy?: any;
	displayAttributes:DisplayAttribute[],
	displayInfoCard:VarDisplayView[]
	displayBar:VarDisplayView[]
	autonomyMemory: RuntimeVariable[];
	autonomyState: {
		currentGoal?: string;
		lastActionName?: string;
		lastDecisionTime: number;
		cycle: number;
		cooldowns: Record<string, number>;
	};
};

export type RuntimeItem = {
	id: string;
	name: string;
	description: string;
	vars: RuntimeVariable[];
	location: ItemLocation;
};

export type RuntimeTarget =
	| { type: 'character'; id: string }
	| { type: 'place'; id: string }
	| { type: 'item'; id: string }
	| { type: 'self'; id: string };

export type ActionOption = {
	id: string;
	name: string;
	description?: string;
	locked: boolean;
	actionName: string;
	actorId: string;
	targets: RuntimeTarget[];
	executionTime: number;
	buildMode: 'oneActionPerTarget' | 'oneActionForAllTargets' | 'oneActionPerTargetType';
	availableTo: 'player' | 'autonomous';
};

export type RunningAction = {
	id: string;
	option: ActionOption;
	actionName: string;
	actorId: string;
	startedAt: number;
	completeAt: number;
	cancelled?: boolean;
	categories: string[];
	attributes: string[];
};
export type RuntimeGetter = {
	type: 'getter';
	in: string;
	variable: string;
	fallback?: string | number | boolean;	
}
export type RuntimeEvent = {
	id: string;
	time: number;
	/** Used to determine the order of events in chronological order */
	sequence: number;
	event: string;
	context: {
		actorId?: string;
		targetId?: string;
		subjectId?: string;
		placeId?: string;
		audience?: string;
		tags?: string[];
	};
	data: Record<string, string | number | boolean>;
	actionInstanceId?: string;
	consumed?: boolean;
};
export type ActiveDialogue = {
	id: string;
	dialogueId: string;
	selfId: string;
	targetId: string;
	nodeId: string;
};

export type DialogueView = {
	id: string;
	speaker: string;
	text: string;
	choices: { id: string; text: string }[];
};

export type RuntimeState = {
	time: number;
	world: RuntimeVariable[];
	places: RuntimePlace[];
	characters: RuntimeCharacter[];
	items: RuntimeItem[];
	runningActions: RunningAction[];
	eventQueue: RuntimeEvent[];
	log: string[];
	activeDialogue?: ActiveDialogue;
	nextSequence: number;
	debug: string[];
};

export type WorldIndexes = {
	places: Map<string, any>;
	characters: Map<string, any>;
	items: Map<string, any>;
	itemsByPlace: Map<string, RuntimeItem[]>;
	itemsByCharacter: Map<string, RuntimeItem[]>;
	actions: Map<string, any>;
	dialogues: Map<string, any>;
	dialoguesByIntent: Map<string, any[]>;
	templatesByEvent: Map<string, any[]>;
};

export type ResolveContext = {
	self?: RuntimeCharacter | string;
	target?: RuntimeTarget;
	temp?: Record<string, string | number | boolean>;
	event?: RuntimeEvent;
	actionRuntime?: Partial<RunningAction> & { actionName?: string; executionTime?: number; isFromPlayer?: boolean };
	autonomyRuntime?: Record<string, string | number | boolean>;
	eventRuntime?: {event: string; actorId?: string; targetId?: string; subjectId?: string; placeId?: string;};
	debug?: string[];
};

export type ResolvedValue = {
	ok: boolean;
	value?: string | number | boolean;
	path?: string;
	reason?: string;
	variable?: RuntimeVariable;
};

export type GameCommand =
	| { type: 'start-action'; actionOptionId: string }
	| { type: 'choose-dialogue'; choiceId: string };

export type GameView = {
	time: number;
	playerId: string;
	currentPlace: RuntimePlace;
	visibleCharacters: RuntimeCharacter[];
	items: RuntimeItem[];
	availableActions: ActionOption[];
	activeDialogue?: DialogueView;
	log: string[];
};

export type Engine = {
	getState: () => RuntimeState;
	getView: () => GameView;
	dispatch: (command: GameCommand) => GameView;
	save: () => string;
	load: (serialized: string) => GameView;
	validate: () => string[];
};
