import type { GameDecision, ServerGameDefinition } from "@experiential/simulation-kit";

export interface StoredGame<Event, State> { version: number; events: Event[]; state: State; commandIds: string[] }

export function applyGameCommand<Config, State, Action, Event, View>(
  definition: ServerGameDefinition<Config, State, Action, Event, View>,
  stored: StoredGame<Event, State>, action: Action, context: Parameters<typeof definition.decide>[2], commandId: string,
): { stored: StoredGame<Event, State>; decision: GameDecision<Event> } {
  if (stored.commandIds.includes(commandId)) return { stored, decision: { ok: true, events: [] } };
  const decision = definition.decide(stored.state, action, context);
  if (!decision.ok) return { stored, decision };
  const state = decision.events.reduce(definition.fold, stored.state);
  return { decision, stored: { version: stored.version + decision.events.length, events: [...stored.events, ...decision.events], state, commandIds: [...stored.commandIds, commandId] } };
}
